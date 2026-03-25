import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService } from "./prisma.service";
import { RuntimeConfigService } from "./runtime-config.service";

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  exp: number;
};

@Injectable()
export class AuthService {
  private readonly secretMask = "********";

  constructor(
    private readonly prisma: PrismaService,
    private readonly runtimeConfigService: RuntimeConfigService
  ) {}

  private hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    return `scrypt:${salt}:${derived}`;
  }

  private verifyPassword(password: string, passwordHash: string) {
    const [algorithm, salt, hash] = passwordHash.split(":");

    if (algorithm !== "scrypt" || !salt || !hash) {
      return false;
    }

    const derived = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
  }

  private async signSession(payload: SessionPayload) {
    const settings = await this.runtimeConfigService.load();
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", settings.app.sessionSecret)
      .update(encoded)
      .digest("base64url");

    return `${encoded}.${signature}`;
  }

  private async verifySessionToken(token: string) {
    const settings = await this.runtimeConfigService.load();
    const [encoded, signature] = token.split(".");

    if (!encoded || !signature) {
      throw new UnauthorizedException("登录态无效。");
    }

    const expected = crypto
      .createHmac("sha256", settings.app.sessionSecret)
      .update(encoded)
      .digest("base64url");

    if (signature !== expected) {
      throw new UnauthorizedException("登录态校验失败。");
    }

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("登录态已过期。");
    }

    return payload;
  }

  private readToken(input?: string) {
    if (!input) {
      throw new UnauthorizedException("未提供登录态。");
    }

    if (input.startsWith("Bearer ")) {
      return input.slice(7);
    }

    return input;
  }

  private sanitizeCredential(value?: string | null) {
    return value ? this.secretMask : "";
  }

  private resolveCredential(nextValue: string, currentValue?: string | null) {
    if (!nextValue || nextValue === this.secretMask) {
      return currentValue ?? null;
    }

    return nextValue;
  }

  async register(input: { name: string; email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ConflictException("该邮箱已经注册。");
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: `${input.name.trim()} 的工作台租户`
      }
    });

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: input.name.trim(),
        email,
        passwordHash: this.hashPassword(input.password),
        role: "CUSTOMER"
      }
    });

    const token = await this.signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
    });

    return {
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          chcyAccessKey: "",
          chcySecretKey: "",
          hasChcyCredentials: false
        }
      }
    };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() }
    });

    if (!user || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("账号或密码错误。");
    }

    const token = await this.signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
    });

    return {
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          chcyAccessKey: this.sanitizeCredential(user.chcyAccessKey),
          chcySecretKey: this.sanitizeCredential(user.chcySecretKey),
          hasChcyCredentials: Boolean(user.chcyAccessKey && user.chcySecretKey)
        }
      }
    };
  }

  async getCurrentUser(authorization?: string) {
    const session = await this.verifySessionToken(this.readToken(authorization));
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });

    if (!user) {
      throw new UnauthorizedException("用户不存在。");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      chcyAccessKey: user.chcyAccessKey,
      chcySecretKey: user.chcySecretKey
    };
  }

  async getProfile(authorization?: string) {
    const user = await this.getCurrentUser(authorization);

    return {
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        chcyAccessKey: this.sanitizeCredential(user.chcyAccessKey),
        chcySecretKey: this.sanitizeCredential(user.chcySecretKey),
        hasChcyCredentials: Boolean(user.chcyAccessKey && user.chcySecretKey)
      }
    };
  }

  async updateProfileCredentials(
    authorization: string | undefined,
    input: { chcyAccessKey: string; chcySecretKey: string }
  ) {
    const user = await this.getCurrentUser(authorization);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        chcyAccessKey: this.resolveCredential(input.chcyAccessKey, user.chcyAccessKey),
        chcySecretKey: this.resolveCredential(input.chcySecretKey, user.chcySecretKey)
      }
    });

    return {
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        tenantId: updated.tenantId,
        chcyAccessKey: this.sanitizeCredential(updated.chcyAccessKey),
        chcySecretKey: this.sanitizeCredential(updated.chcySecretKey),
        hasChcyCredentials: Boolean(updated.chcyAccessKey && updated.chcySecretKey)
      }
    };
  }
}
