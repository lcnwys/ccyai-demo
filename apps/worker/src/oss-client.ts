import OSS from "ali-oss";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import pino from "pino";
import { loadRuntimeSettings } from "./runtime-config";

const logger = pino({ name: "worker:oss" });

export class OssClient {
  private readonly localRoot = path.resolve(process.cwd(), "storage");

  constructor() {
    logger.info({ msg: "oss client bootstrapped" });
  }

  private async getRuntime() {
    const settings = await loadRuntimeSettings();
    const bucket = settings.oss?.bucket ?? process.env.ALI_OSS_BUCKET ?? "";
    const region = settings.oss?.region ?? process.env.ALI_OSS_REGION ?? "";
    const accessKeyId = settings.oss?.accessKeyId ?? process.env.ALI_OSS_ACCESS_KEY_ID ?? "";
    const accessKeySecret =
      settings.oss?.accessKeySecret ?? process.env.ALI_OSS_ACCESS_KEY_SECRET ?? "";
    const useLocalStorage = !bucket || bucket === "replace_me";
    const client = useLocalStorage
      ? null
      : new OSS({
          region,
          bucket,
          accessKeyId,
          accessKeySecret,
          authorizationV4: true
        });

    logger.info({
      mode: useLocalStorage ? "local" : "oss",
      region,
      bucket: bucket || "(empty)"
    }, "oss client initialized");

    return { bucket, region, useLocalStorage, client };
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

    logger.info({ key, bucket: runtime.bucket }, "uploaded file to oss");

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
      logger.info({ key: ossKey, bucket: runtime.bucket }, "downloaded file from oss");
      return result.content as Buffer;
    } catch (error) {
      logger.error(
        {
          key: ossKey,
          bucket: runtime.bucket,
          region: runtime.region,
          error
        },
        "failed to download file from oss"
      );
      throw error;
    }
  }
}


