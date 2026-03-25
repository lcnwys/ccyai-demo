import crypto from "node:crypto";
import pino from "pino";
import { loadRuntimeSettings } from "./runtime-config";

const logger = pino({ name: "worker:chcy" });

export class ChcyAiClient {
  private nonce() {
    return crypto.randomBytes(12).toString("base64url");
  }

  private timestamp() {
    return Math.floor(Date.now() / 1000).toString();
  }

  private buildSignature(input: {
    method: string;
    path: string;
    query?: Record<string, string>;
    body?: string;
    timestamp: string;
    nonce: string;
    secretKey: string;
  }) {
    const queryString = Object.entries(input.query ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");

    const bodyHash = crypto
      .createHash("sha256")
      .update(input.body ?? "", "utf8")
      .digest("hex");

    const content = [
      input.method.toUpperCase(),
      input.path,
      queryString,
      bodyHash,
      input.timestamp,
      input.nonce
    ].join("\n");

    return crypto
      .createHmac("sha256", input.secretKey)
      .update(content, "utf8")
      .digest("base64url");
  }

  private async request<T>(input: {
    method: string;
    path: string;
    body?: Record<string, unknown>;
    query?: Record<string, string>;
    signatureQuery?: Record<string, string>;
  }): Promise<T> {
    const settings = await loadRuntimeSettings();
    const baseUrl = settings.chcy?.apiBaseUrl ?? process.env.CHCY_API_BASE_URL ?? "https://api.chcyai.com";
    const accessKey = settings.chcy?.accessKey ?? process.env.CHCY_ACCESS_KEY ?? "";
    const secretKey = settings.chcy?.secretKey ?? process.env.CHCY_SECRET_KEY ?? "";
    const timestamp = this.timestamp();
    const nonce = this.nonce();
    const body = input.body ? JSON.stringify(input.body) : undefined;
    const queryString = input.query
      ? `?${Object.entries(input.query)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join("&")}`
      : "";

    const response = await fetch(`${baseUrl}${input.path}${queryString}`, {
      method: input.method,
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": accessKey,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": this.buildSignature({
          method: input.method,
          path: input.path,
          query: input.signatureQuery ?? input.query,
          body,
          timestamp,
          nonce,
          secretKey
        })
      },
      body
    });

    logger.info(
      {
        method: input.method.toUpperCase(),
        path: `${input.path}${queryString}`,
        body: input.body ?? null
      },
      "sending chcy request"
    );

    if (!response.ok) {
      const text = await response.text();
      logger.error(
        {
          method: input.method.toUpperCase(),
          path: `${input.path}${queryString}`,
          status: response.status,
          body: text
        },
        "chcy request failed"
      );
      throw new Error(`CHCY request failed: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as T;
    logger.info(
      {
        method: input.method.toUpperCase(),
        path: `${input.path}${queryString}`,
        payload
      },
      "received chcy response"
    );
    return payload;
  }

  async uploadFile(file: { fileName: string; contentType: string; buffer: Buffer }) {
    const settings = await loadRuntimeSettings();
    const baseUrl = settings.chcy?.apiBaseUrl ?? process.env.CHCY_API_BASE_URL ?? "https://api.chcyai.com";
    const accessKey = settings.chcy?.accessKey ?? process.env.CHCY_ACCESS_KEY ?? "";
    const secretKey = settings.chcy?.secretKey ?? process.env.CHCY_SECRET_KEY ?? "";
    const path = "/v1/files/uploads";
    const timestamp = this.timestamp();
    const nonce = this.nonce();
    const signature = this.buildSignature({
      method: "POST",
      path,
      timestamp,
      nonce,
      secretKey
    });

    const form = new FormData();
    const uint8 = new Uint8Array(file.buffer);
    form.append("file", new Blob([uint8], { type: file.contentType }), file.fileName);

    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "X-Access-Key": accessKey,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature
      },
      body: form
    });

    logger.info(
      {
        method: "POST",
        path,
        fileName: file.fileName,
        contentType: file.contentType,
        size: file.buffer.byteLength
      },
      "uploading file to chcy"
    );

    if (!response.ok) {
      const text = await response.text();
      logger.error(
        {
          method: "POST",
          path,
          status: response.status,
          body: text
        },
        "chcy upload failed"
      );
      throw new Error(`CHCY upload failed: ${response.status} ${text}`);
    }

    const payload =
      (await response.json()) as { data: string; requestId: string; status: string };
    logger.info({ method: "POST", path, payload }, "received chcy upload response");
    return payload;
  }

  createPrintingTask(payload: {
    callbackUrl: string;
    referenceImageId: string;
    fileName?: string;
    prompt?: string;
    resolutionRatioId: number;
    isPatternCompleted: 0 | 1;
  }) {
    return this.request<{ data: string; requestId: string; status: string }>({
      method: "POST",
      path: "/v1/printing/generations",
      body: payload
    });
  }

  createImageTask(payload: {
    callbackUrl: string;
    prompt: string;
    referenceImageIdList?: string[];
    aspectRatioId?: number;
    resolutionRatioId: number;
    fileName?: string;
  }) {
    return this.request<{ data: string; requestId: string; status: string }>({
      method: "POST",
      path: "/v1/images/generations",
      body: payload
    });
  }

  createFissionTask(payload: {
    callbackUrl: string;
    prompt?: string;
    fileName?: string;
    referenceImageId: string;
    similarity: number;
    resolutionRatioId: number;
    aspectRatio: number;
  }) {
    return this.request<{ data: string; requestId: string; status: string }>({
      method: "POST",
      path: "/v1/fission/generations",
      body: payload
    });
  }

  getPrintingTaskInfo(taskId: string) {
    return this.request<{
      data: { generateImageId: string; deductibleAmount?: string };
      requestId: string;
      status: string;
    }>({
      method: "GET",
      path: `/v1/printing/info/${taskId}`,
      signatureQuery: {
        taskId
      }
    });
  }

  getImageTaskInfo(taskId: string) {
    return this.request<{
      data: { generateImageId: string; deductibleAmount?: string };
      requestId: string;
      status: string;
    }>({
      method: "GET",
      path: `/v1/images/info/${taskId}`,
      signatureQuery: {
        taskId
      }
    });
  }

  getFissionTaskInfo(taskId: string) {
    return this.request<{
      data: { generateImageId: string; deductibleAmount?: string };
      requestId: string;
      status: string;
    }>({
      method: "GET",
      path: `/v1/fission/info/${taskId}`,
      signatureQuery: {
        taskId
      }
    });
  }

  getFileDownloadUrl(fileId: string) {
    return this.request<{
      data: string;
      requestId: string;
      status: string;
    }>({
      method: "GET",
      path: `/v1/files/downloads/${fileId}`,
      signatureQuery: {
        fileId
      }
    });
  }
}
