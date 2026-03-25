import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type RuntimeSettings = {
  app: {
    loginEmail: string;
    loginPassword: string;
    sessionSecret: string;
  };
  chcy: {
    apiBaseUrl: string;
    accessKey: string;
    secretKey: string;
    callbackBaseUrl: string;
  };
  oss: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
  };
};

@Injectable()
export class RuntimeConfigService {
  private readonly filePath = path.resolve(process.cwd(), "storage", "runtime-settings.json");
  private readonly secretMask = "********";

  private getDefaults(): RuntimeSettings {
    return {
      app: {
        loginEmail: process.env.APP_LOGIN_EMAIL ?? "sales@chcy.local",
        loginPassword: process.env.APP_LOGIN_PASSWORD ?? "chcy123456",
        sessionSecret: process.env.APP_SESSION_SECRET ?? "chcy-internal-session-secret"
      },
      chcy: {
        apiBaseUrl: process.env.CHCY_API_BASE_URL ?? "https://api.chcyai.com",
        accessKey: process.env.CHCY_ACCESS_KEY ?? "",
        secretKey: process.env.CHCY_SECRET_KEY ?? "",
        callbackBaseUrl: process.env.CHCY_CALLBACK_BASE_URL ?? "http://127.0.0.1:3001"
      },
      oss: {
        region: process.env.ALI_OSS_REGION ?? "",
        bucket: process.env.ALI_OSS_BUCKET ?? "",
        accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID ?? "",
        accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET ?? ""
      }
    };
  }

  private mergeSettings(
    defaults: RuntimeSettings,
    overrides?: Partial<RuntimeSettings>
  ): RuntimeSettings {
    return {
      app: {
        ...defaults.app,
        ...(overrides?.app ?? {})
      },
      chcy: {
        ...defaults.chcy,
        ...(overrides?.chcy ?? {})
      },
      oss: {
        ...defaults.oss,
        ...(overrides?.oss ?? {})
      }
    };
  }

  private sanitize(settings: RuntimeSettings) {
    return {
      app: {
        ...settings.app,
        loginPassword: settings.app.loginPassword ? this.secretMask : "",
        sessionSecret: settings.app.sessionSecret ? this.secretMask : ""
      },
      chcy: {
        ...settings.chcy,
        accessKey: settings.chcy.accessKey ? this.secretMask : "",
        secretKey: settings.chcy.secretKey ? this.secretMask : ""
      },
      oss: {
        ...settings.oss,
        accessKeyId: settings.oss.accessKeyId ? this.secretMask : "",
        accessKeySecret: settings.oss.accessKeySecret ? this.secretMask : ""
      }
    };
  }

  private resolveSecret(nextValue: string, currentValue: string) {
    if (!nextValue || nextValue === this.secretMask) {
      return currentValue;
    }

    return nextValue;
  }

  async load() {
    const defaults = this.getDefaults();

    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<RuntimeSettings>;
      return this.mergeSettings(defaults, parsed);
    } catch {
      return defaults;
    }
  }

  async getPublicSettings() {
    const settings = await this.load();
    return {
      data: this.sanitize(settings)
    };
  }

  async update(next: RuntimeSettings) {
    const current = await this.load();
    const merged: RuntimeSettings = {
      app: {
        loginEmail: next.app.loginEmail,
        loginPassword: this.resolveSecret(next.app.loginPassword, current.app.loginPassword),
        sessionSecret: this.resolveSecret(next.app.sessionSecret, current.app.sessionSecret)
      },
      chcy: {
        apiBaseUrl: next.chcy.apiBaseUrl,
        accessKey: this.resolveSecret(next.chcy.accessKey, current.chcy.accessKey),
        secretKey: this.resolveSecret(next.chcy.secretKey, current.chcy.secretKey),
        callbackBaseUrl: next.chcy.callbackBaseUrl
      },
      oss: {
        region: next.oss.region,
        bucket: next.oss.bucket,
        accessKeyId: this.resolveSecret(next.oss.accessKeyId, current.oss.accessKeyId),
        accessKeySecret: this.resolveSecret(next.oss.accessKeySecret, current.oss.accessKeySecret)
      }
    };

    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(merged, null, 2), "utf8");
    return {
      data: this.sanitize(merged)
    };
  }
}
