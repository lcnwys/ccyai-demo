import OSS from "ali-oss";
import { Injectable, Logger } from "@nestjs/common";
import crypto from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { RuntimeConfigService } from "./runtime-config.service";

@Injectable()
export class OssService {
  private readonly logger = new Logger(OssService.name);
  private readonly localRoot = path.resolve(process.cwd(), "storage");

  constructor(private readonly runtimeConfigService: RuntimeConfigService) {}

  private async getRuntime() {
    const settings = await this.runtimeConfigService.load();
    const bucket = settings.oss.bucket;
    const useLocalStorage = !bucket || bucket === "replace_me";
    const client = useLocalStorage
      ? null
      : new OSS({
          region: settings.oss.region,
          bucket,
          accessKeyId: settings.oss.accessKeyId,
          accessKeySecret: settings.oss.accessKeySecret,
          authorizationV4: true
        });

    this.logger.log(
      `OSS mode=${useLocalStorage ? "local" : "oss"} region=${settings.oss.region} bucket=${bucket || "(empty)"}`
    );

    return {
      bucket,
      useLocalStorage,
      client,
      region: settings.oss.region
    };
  }

  createObjectKey(input: { tenantId: string; fileName: string; folder?: string }) {
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `${input.folder ?? "raw"}/${input.tenantId}/${date}/${crypto.randomUUID()}-${safeName}`;
  }

  async putBuffer(input: {
    tenantId: string;
    fileName: string;
    contentType: string;
    buffer: Buffer;
    folder?: string;
  }) {
    const key = this.createObjectKey({
      tenantId: input.tenantId,
      fileName: input.fileName,
      folder: input.folder
    });
    const runtime = await this.getRuntime();

    if (runtime.useLocalStorage) {
      const localPath = path.join(this.localRoot, key);
      await mkdir(path.dirname(localPath), { recursive: true });
      await writeFile(localPath, input.buffer);

      return {
        key,
        url: `/local-storage/${key}`
      };
    }

    const result = await runtime.client!.put(key, input.buffer, {
      headers: {
        "Content-Type": input.contentType
      }
    });

    this.logger.log(`Uploaded file to OSS bucket=${runtime.bucket} key=${key}`);

    return {
      key,
      url: result.url
    };
  }

  async getBuffer(ossKey: string) {
    const runtime = await this.getRuntime();

    if (runtime.useLocalStorage) {
      return readFile(path.join(this.localRoot, ossKey));
    }

    try {
      const result = await runtime.client!.get(ossKey);
      this.logger.log(`Downloaded file from OSS bucket=${runtime.bucket} key=${ossKey}`);
      return result.content as Buffer;
    } catch (error) {
      this.logger.error(
        `Failed to download file from OSS bucket=${runtime.bucket} key=${ossKey} region=${runtime.region}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }
}
