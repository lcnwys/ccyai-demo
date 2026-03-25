import { Injectable, Logger } from "@nestjs/common";
import crypto from "node:crypto";
import { RuntimeConfigService } from "./runtime-config.service";

type ChcyCredentialOverride = {
  accessKey?: string;
  secretKey?: string;
};

@Injectable()
export class ChcyAiClient {
  private readonly logger = new Logger(ChcyAiClient.name);

  constructor(private readonly runtimeConfigService: RuntimeConfigService) {}

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
    credentials?: ChcyCredentialOverride;
  }): Promise<T> {
    const settings = await this.runtimeConfigService.load();
    const accessKey = input.credentials?.accessKey || settings.chcy.accessKey;
    const secretKey = input.credentials?.secretKey || settings.chcy.secretKey;
    const timestamp = this.timestamp();
    const nonce = this.nonce();
    const body = input.body ? JSON.stringify(input.body) : undefined;
    const queryString = input.query
      ? `?${Object.entries(input.query)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join("&")}`
      : "";

    const response = await fetch(`${settings.chcy.apiBaseUrl}${input.path}${queryString}`, {
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

    this.logger.log(
      `CHCY request ${input.method.toUpperCase()} ${input.path}${queryString} body=${
        body ?? ""
      }`
    );

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(
        `CHCY response failed ${input.method.toUpperCase()} ${input.path}${queryString} status=${response.status} body=${text}`
      );
      throw new Error(`CHCY API error ${response.status}: ${text}`);
    }

    const payload = (await response.json()) as T;
    this.logger.log(
      `CHCY response ok ${input.method.toUpperCase()} ${input.path}${queryString} payload=${JSON.stringify(payload)}`
    );
    return payload;
  }

  createPrintingTask(payload: {
    callbackUrl: string;
    referenceImageId: string;
    fileName?: string;
    prompt?: string;
    resolutionRatioId: number;
    isPatternCompleted: 0 | 1;
  }, credentials?: ChcyCredentialOverride) {
    return this.request<{ data: string; requestId: string; status: string }>({
      method: "POST",
      path: "/v1/printing/generations",
      body: payload,
      credentials
    });
  }

  getPrintingTaskInfo(taskId: string, credentials?: ChcyCredentialOverride) {
    return this.request<{
      data: { generateImageId: string; deductibleAmount: string };
      requestId: string;
      status: string;
    }>({
      method: "GET",
      path: `/v1/printing/info/${taskId}`,
      signatureQuery: {
        taskId
      },
      credentials
    });
  }

  getFissionTaskInfo(taskId: string, credentials?: ChcyCredentialOverride) {
    return this.request<{
      data: { generateImageId: string; deductibleAmount?: string };
      requestId: string;
      status: string;
    }>({
      method: "GET",
      path: `/v1/fission/info/${taskId}`,
      signatureQuery: {
        taskId
      },
      credentials
    });
  }

  createPrintAssetTask(payload: {
    callbackUrl: string;
    referenceImageId: string;
    fileName?: string;
    dpi: number;
    imageHeight: number;
    imageWidth: number;
    selectedArea?: {
      cropX?: number;
      cropY?: number;
      cropW?: number;
      cropH?: number;
    };
  }, credentials?: ChcyCredentialOverride) {
    return this.request<{ data: string; requestId: string; status: string }>({
      method: "POST",
      path: "/v1/prints/generations",
      body: payload,
      credentials
    });
  }

  getPrintAssetTaskInfo(taskId: string, credentials?: ChcyCredentialOverride) {
    return this.request<{
      data: { generateImageId: string; deductibleAmount?: string };
      requestId: string;
      status: string;
    }>({
      method: "GET",
      path: `/v1/prints/info/${taskId}`,
      signatureQuery: {
        taskId
      },
      credentials
    });
  }

  getFileDownloadUrl(fileId: string, credentials?: ChcyCredentialOverride) {
    return this.request<{
      data: string;
      requestId: string;
      status: string;
    }>({
      method: "GET",
      path: `/v1/files/downloads/${fileId}`,
      signatureQuery: {
        fileId
      },
      credentials
    });
  }

  createImageTask(payload: {
    callbackUrl: string;
    prompt: string;
    referenceImageIdList?: string[];
    aspectRatioId?: number;
    resolutionRatioId: number;
    fileName?: string;
  }, credentials?: ChcyCredentialOverride) {
    return this.request<{ data: string; requestId: string; status: string }>({
      method: "POST",
      path: "/v1/images/generations",
      body: payload,
      credentials
    });
  }

  getImageTaskInfo(taskId: string, credentials?: ChcyCredentialOverride) {
    return this.request<{
      data: { generateImageId: string; deductibleAmount?: string };
      requestId: string;
      status: string;
    }>({
      method: "GET",
      path: `/v1/images/info/${taskId}`,
      signatureQuery: {
        taskId
      },
      credentials
    });
  }
}
