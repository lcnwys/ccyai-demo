import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma, BatchItemStatus, BatchItemStep, BatchJobStatus } from "@prisma/client";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { CallbackAuditService } from "./callback-audit.service";
import { QueueService } from "./queue.service";
import { PrismaService } from "./prisma.service";
import { RuntimeConfigService } from "./runtime-config.service";

@Injectable()
export class CallbackService {
  private readonly nonceCache = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly callbackAuditService: CallbackAuditService,
    private readonly runtimeConfigService: RuntimeConfigService
  ) {}

  private cleanupNonceCache(nowSeconds: number) {
    for (const [nonce, expiresAt] of this.nonceCache.entries()) {
      if (expiresAt <= nowSeconds) {
        this.nonceCache.delete(nonce);
      }
    }
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

  private async verifyCallback(input: {
    headers: Record<string, string | string[] | undefined>;
    rawBody?: Buffer;
  }) {
    const settings = await this.runtimeConfigService.load();
    const signature = String(input.headers["x-signature"] ?? "");
    const timestamp = String(input.headers["x-timestamp"] ?? "");
    const nonce = String(input.headers["x-nonce"] ?? "");
    const accessKey = String(input.headers["x-access-key"] ?? "");

    if (!signature || !timestamp || !nonce) {
      throw new UnauthorizedException("missing callback signature headers");
    }

    if (settings.chcy.accessKey && accessKey && accessKey !== settings.chcy.accessKey) {
      throw new UnauthorizedException("invalid callback access key");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const requestSeconds = Number(timestamp);
    if (!Number.isFinite(requestSeconds) || Math.abs(nowSeconds - requestSeconds) > 300) {
      throw new UnauthorizedException("callback timestamp expired");
    }

    this.cleanupNonceCache(nowSeconds);
    if (this.nonceCache.has(nonce)) {
      throw new UnauthorizedException("callback nonce replayed");
    }

    const expectedSignature = this.buildSignature({
      method: "POST",
      path: "/api/callbacks/chcyai",
      body: input.rawBody?.toString("utf8") ?? "",
      timestamp,
      nonce,
      secretKey: settings.chcy.secretKey
    });

    if (signature !== expectedSignature) {
      throw new UnauthorizedException("invalid callback signature");
    }

    this.nonceCache.set(nonce, nowSeconds + 300);
  }

  async handleProviderCallback(input: {
    body: Record<string, unknown>;
    headers: Record<string, string | string[] | undefined>;
    rawBody?: Buffer;
  }) {
    const providerTaskId = String(input.body.taskId ?? input.body.requestId ?? "");
    const requestId = String(input.body.requestId ?? "");

    try {
      await this.verifyCallback({
        headers: input.headers,
        rawBody: input.rawBody
      });
    } catch (error) {
      await this.callbackAuditService.record({
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        outcome: "rejected",
        reason: error instanceof Error ? error.message : "signature_verification_failed",
        providerTaskId: providerTaskId || null,
        requestId: requestId || null,
        headers: input.headers,
        body: input.body
      });
      throw error;
    }

    if (!providerTaskId) {
      await this.callbackAuditService.record({
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        outcome: "ignored",
        reason: "missing_task_id",
        providerTaskId: null,
        requestId: requestId || null,
        headers: input.headers,
        body: input.body
      });
      return { accepted: false, reason: "missing_task_id" };
    }

    const providerTask = await this.prisma.providerTask.findFirst({
      where: { providerTaskId },
      include: {
        batchJobItem: {
          include: {
            batchJob: true
          }
        }
      }
    });

    if (!providerTask) {
      await this.callbackAuditService.record({
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        outcome: "ignored",
        reason: "provider_task_not_found",
        providerTaskId,
        requestId: requestId || null,
        headers: input.headers,
        body: input.body
      });
      return { accepted: false, reason: "provider_task_not_found" };
    }

    await this.prisma.providerTask.update({
      where: { id: providerTask.id },
      data: {
        status: "CALLBACK_SUCCESS",
        callbackPayload: input.body as Prisma.InputJsonValue
      }
    });

    const item = providerTask.batchJobItem;

    if (providerTask.taskType === "PRINTING") {
      await this.prisma.batchJobItem.update({
        where: { id: item.id },
        data: {
          status: BatchItemStatus.SUCCESS,
          step:
            item.batchJob.type === "EXTRACT_THEN_GENERATE"
              ? BatchItemStep.GENERATE
              : BatchItemStep.DONE
        }
      });

      if (item.batchJob.type === "EXTRACT_THEN_GENERATE") {
        await this.queueService.enqueueImageJob({
          tenantId: item.tenantId,
          batchJobId: item.batchJobId,
          itemId: item.id,
          sourceFileId: item.sourceFileId ?? undefined,
          prompt: item.prompt ?? undefined,
          aspectRatioId: item.aspectRatioId ?? undefined,
          resolutionId: item.resolutionId ?? undefined
        });
      }
    }

    if (providerTask.taskType === "IMAGE") {
      await this.prisma.batchJobItem.update({
        where: { id: item.id },
        data: {
          status: BatchItemStatus.SUCCESS,
          step: BatchItemStep.DONE
        }
      });
    }

    const successCount = await this.prisma.batchJobItem.count({
      where: {
        batchJobId: item.batchJobId,
        status: BatchItemStatus.SUCCESS
      }
    });

    const failedCount = await this.prisma.batchJobItem.count({
      where: {
        batchJobId: item.batchJobId,
        status: BatchItemStatus.FAILED
      }
    });

    const totalCount = await this.prisma.batchJobItem.count({
      where: { batchJobId: item.batchJobId }
    });

    await this.prisma.batchJob.update({
      where: { id: item.batchJobId },
      data: {
        successCount,
        failedCount,
        status:
          successCount === totalCount
            ? BatchJobStatus.SUCCESS
            : failedCount > 0
              ? BatchJobStatus.PARTIAL_SUCCESS
              : BatchJobStatus.RUNNING
      }
    });

    await this.callbackAuditService.record({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      outcome: "accepted",
      reason: "callback_applied",
      providerTaskId,
      requestId: requestId || null,
      headers: input.headers,
      body: input.body
    });

    return { accepted: true, providerTaskId };
  }
}
