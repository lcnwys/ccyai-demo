import { Injectable, UnauthorizedException } from "@nestjs/common";
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
  private readonly bootstrapTenantId = "demo-tenant";
  private readonly bootstrapUserId = "demo-sales-user";

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

  async ensureBootstrapUser() {
    const settings = await this.runtimeConfigService.load();

    await this.prisma.tenant.upsert({
      where: { id: this.bootstrapTenantId },
      update: {
        name: "创次元内部测试租户"
      },
      create: {
        id: this.bootstrapTenantId,
        name: "创次元内部测试租户"
      }
    });

    const userPayload = {
      tenantId: this.bootstrapTenantId,
      name: "创次元销售测试账号",
      email: settings.app.loginEmail.trim().toLowerCase(),
      passwordHash: this.hashPassword(settings.app.loginPassword),
      role: "ADMIN"
    };

    const bootstrapUser = await this.prisma.user.findUnique({
      where: { id: this.bootstrapUserId }
    });

    if (bootstrapUser) {
      await this.prisma.user.update({
        where: { id: this.bootstrapUserId },
        data: userPayload
      });
      return;
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: userPayload.email }
    });

    if (existingByEmail) {
      await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: userPayload
      });
      return;
    }

    await this.prisma.user.create({
      data: {
        id: this.bootstrapUserId,
        ...userPayload
      }
    });
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
          tenantId: user.tenantId
        }
      }
    };
  }

  getBootstrapInfo() {
    return this.runtimeConfigService.load().then((settings) => ({
      data: {
        email: settings.app.loginEmail
      }
    }));
  }
}
