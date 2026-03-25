import { Injectable, Logger } from "@nestjs/common";
import {
  Prisma,
  BatchItemStatus,
  BatchItemStep,
  BatchJobStatus,
  BatchJobType,
  FileSourceType
} from "@prisma/client";
import archiver from "archiver";
import { PassThrough } from "node:stream";
import { BatchJobPayload, BatchJobTypes } from "@chcy/shared";
import { PrismaService } from "./prisma.service";
import { QueueService } from "./queue.service";
import { OssService } from "./oss.service";
import { ChcyAiClient } from "./chcyai.client";
import { RuntimeConfigService } from "./runtime-config.service";

export type CreateBatchJobDto = BatchJobPayload;

@Injectable()
export class BatchJobsService {
  private readonly logger = new Logger(BatchJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly ossService: OssService,
    private readonly chcyAiClient: ChcyAiClient,
    private readonly runtimeConfigService: RuntimeConfigService
  ) {}

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractGenerateImageId(
    providerTasks: Array<{
      callbackPayload: Prisma.JsonValue | null;
    }>
  ) {
    for (const task of providerTasks) {
      const payload = task.callbackPayload as
        | {
            data?: { generateImageId?: string };
          }
        | null;

      if (payload?.data?.generateImageId) {
        return payload.data.generateImageId;
      }
    }

    return null;
  }

  private async refreshBatchJob(batchJobId: string) {
    const successCount = await this.prisma.batchJobItem.count({
      where: {
        batchJobId,
        status: BatchItemStatus.SUCCESS
      }
    });

    const failedCount = await this.prisma.batchJobItem.count({
      where: {
        batchJobId,
        status: BatchItemStatus.FAILED
      }
    });

    const totalCount = await this.prisma.batchJobItem.count({
      where: { batchJobId }
    });

    await this.prisma.batchJob.update({
      where: { id: batchJobId },
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
  }

  private inferExtension(input: { contentType?: string | null; url?: string }) {
    const urlPath = input.url ? new URL(input.url).pathname : "";
    const extFromUrl = urlPath.split(".").pop();

    if (extFromUrl && extFromUrl.length <= 5 && !extFromUrl.includes("/")) {
      return extFromUrl.toLowerCase();
    }

    if (input.contentType?.includes("png")) {
      return "png";
    }

    if (input.contentType?.includes("jpeg") || input.contentType?.includes("jpg")) {
      return "jpg";
    }

    if (input.contentType?.includes("webp")) {
      return "webp";
    }

    return "png";
  }

  private async persistResultFile(input: {
    itemId: string;
    tenantId: string;
    generateImageId?: string | null;
    sourceType: FileSourceType;
    fileNamePrefix: string;
    folder: string;
  }) {
    if (!input.generateImageId) {
      return null;
    }

    const item = await this.prisma.batchJobItem.findUnique({
      where: { id: input.itemId }
    });

    if (!item) {
      return null;
    }

    const fileInfo = await this.chcyAiClient.getFileDownloadUrl(input.generateImageId);
    const downloadUrl = fileInfo.data;
    const downloadResponse = await fetch(downloadUrl);

    if (!downloadResponse.ok) {
      throw new Error(`download result failed: ${downloadResponse.status}`);
    }

    const contentType = downloadResponse.headers.get("content-type") ?? "image/png";
    const extension = this.inferExtension({
      contentType,
      url: downloadUrl
    });
    const buffer = Buffer.from(await downloadResponse.arrayBuffer());
    const fileName = `${input.fileNamePrefix}-${item.id}.${extension}`;
    const uploaded = await this.ossService.putBuffer({
      tenantId: input.tenantId,
      fileName,
      contentType,
      buffer,
      folder: input.folder
    });

    const asset = await this.prisma.fileAsset.create({
      data: {
        tenantId: input.tenantId,
        sourceType: input.sourceType,
        fileName,
        ossKey: uploaded.key,
        size: buffer.byteLength,
        mimeType: contentType,
        providerFileId: input.generateImageId
      }
    });

    await this.prisma.batchJobItem.update({
      where: { id: item.id },
      data: {
        resultFileId: asset.id
      }
    });

    return asset;
  }

  private getImageDimensions(buffer: Buffer) {
    if (
      buffer.length >= 24 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
      };
    }

    if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;

      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }

        const marker = buffer[offset + 1];
        const isStartOfFrame =
          marker >= 0xc0 &&
          marker <= 0xcf &&
          ![0xc4, 0xc8, 0xcc].includes(marker);

        if (isStartOfFrame) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7)
          };
        }

        if (marker === 0xda || marker === 0xd9) {
          break;
        }

        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    }

    throw new Error("暂不支持当前图片格式的尺寸识别，请优先使用 PNG 或 JPEG。");
  }

  private async buildZipBuffer(input: {
    batchJob: Awaited<ReturnType<PrismaService["batchJob"]["findUnique"]>>;
    resultFiles: Array<{
      id: string;
      fileName: string;
      ossKey: string;
      mimeType: string;
    }>;
    manifest: Record<string, unknown>;
  }) {
    const archive = archiver("zip", {
      zlib: { level: 9 }
    });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });

    const completion = new Promise<Buffer>((resolve, reject) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
      stream.on("error", reject);
    });

    archive.pipe(stream);
    archive.append(JSON.stringify(input.manifest, null, 2), {
      name: "manifest.json"
    });

    for (const file of input.resultFiles) {
      const buffer = await this.ossService.getBuffer(file.ossKey);
      archive.append(buffer, {
        name: `results/${file.fileName}`
      });
    }

    await archive.finalize();
    return completion;
  }

  async list() {
    const batchJobs = await this.prisma.batchJob.findMany({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        items: true
      }
    });

    return {
      data: batchJobs.map((job) => ({
        ...job,
        capability:
          ((job.configJson as { capability?: string } | null)?.capability ?? null)
      }))
    };
  }

  async create(payload: CreateBatchJobDto) {
    const batchJob = await this.prisma.batchJob.create({
      data: {
        tenantId: payload.tenantId,
        name: payload.name,
        type: payload.type as BatchJobType,
        status: BatchJobStatus.CREATED,
        totalCount: payload.items.length,
        configJson: (payload.config ?? {}) as Prisma.InputJsonValue,
        createdBy: payload.createdBy,
          items: {
            create: payload.items.map((item) => ({
              tenantId: payload.tenantId,
              sourceFileId: item.sourceFileId ?? null,
              prompt: item.prompt,
            resolutionId: item.resolutionId,
            aspectRatioId: item.aspectRatioId,
            status: BatchItemStatus.PENDING,
            step:
              payload.type === BatchJobTypes.IMAGE_GENERATE
                ? BatchItemStep.GENERATE
                : BatchItemStep.EXTRACT
          }))
        }
      }
    });

    const items = await this.prisma.batchJobItem.findMany({
      where: { batchJobId: batchJob.id }
    });

    await this.prisma.batchJob.update({
      where: { id: batchJob.id },
      data: { status: BatchJobStatus.RUNNING }
    });

    for (const item of items) {
        if (payload.type === BatchJobTypes.IMAGE_GENERATE) {
          await this.queueService.enqueueImageJob({
            tenantId: payload.tenantId,
            batchJobId: batchJob.id,
            itemId: item.id,
            sourceFileId: item.sourceFileId ?? undefined,
            prompt: item.prompt ?? undefined,
            aspectRatioId: item.aspectRatioId ?? undefined,
            resolutionId: item.resolutionId ?? undefined
          });
        } else {
          await this.queueService.enqueuePrintingJob({
            tenantId: payload.tenantId,
            batchJobId: batchJob.id,
            itemId: item.id,
            sourceFileId: item.sourceFileId ?? undefined,
            prompt: item.prompt ?? undefined,
            aspectRatioId: item.aspectRatioId ?? undefined,
            resolutionId: item.resolutionId ?? undefined
          });
        }
    }

    return {
      data: {
        batchJobId: batchJob.id,
        status: BatchJobStatus.RUNNING,
        queuedCount: items.length
      }
    };
  }

  async detail(id: string) {
    const batchJob = await this.prisma.batchJob.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            providerTasks: true
          }
        }
      }
    });

    if (!batchJob) {
      return { data: null };
    }

    const resultFileIds = batchJob.items
      .map((item) => item.resultFileId)
      .filter((value): value is string => Boolean(value));

    const files = resultFileIds.length
      ? await this.prisma.fileAsset.findMany({
          where: {
            id: {
              in: resultFileIds
            }
          }
        })
      : [];

    const fileMap = new Map(files.map((file) => [file.id, file]));

    return {
      data: {
        ...batchJob,
        capability:
          ((batchJob.configJson as { capability?: string } | null)?.capability ?? null),
        items: batchJob.items.map((item) => ({
          ...item,
          hasSourceFile: Boolean(item.sourceFileId),
          resultFile: item.resultFileId ? fileMap.get(item.resultFileId) ?? null : null,
          resultDownloadPath: item.resultFileId
            ? `/api/files/${item.resultFileId}/download`
            : null
        }))
      }
    };
  }

  async retry(id: string) {
    const items = await this.prisma.batchJobItem.findMany({
      where: {
        batchJobId: id,
        status: BatchItemStatus.FAILED
      }
    });

    for (const item of items) {
      if (item.step === BatchItemStep.GENERATE) {
      await this.queueService.enqueueImageJob({
        tenantId: item.tenantId,
        batchJobId: id,
        itemId: item.id,
        sourceFileId: item.sourceFileId ?? undefined,
        prompt: item.prompt ?? undefined,
        aspectRatioId: item.aspectRatioId ?? undefined,
        resolutionId: item.resolutionId ?? undefined
      });
      } else {
      await this.queueService.enqueuePrintingJob({
        tenantId: item.tenantId,
        batchJobId: id,
        itemId: item.id,
        sourceFileId: item.sourceFileId ?? undefined,
        prompt: item.prompt ?? undefined,
        aspectRatioId: item.aspectRatioId ?? undefined,
        resolutionId: item.resolutionId ?? undefined
      });
      }
    }

    return {
      data: {
        batchJobId: id,
        retriedCount: items.length
      }
    };
  }

  async retryItem(id: string) {
    const item = await this.prisma.batchJobItem.findUnique({
      where: { id }
    });

    if (!item) {
      return {
        data: {
          itemId: id,
          retried: false,
          message: "任务项不存在。"
        }
      };
    }

    if (item.step === BatchItemStep.GENERATE) {
      await this.queueService.enqueueImageJob({
        tenantId: item.tenantId,
        batchJobId: item.batchJobId,
        itemId: item.id,
        sourceFileId: item.sourceFileId ?? undefined,
        prompt: item.prompt ?? undefined,
        aspectRatioId: item.aspectRatioId ?? undefined,
        resolutionId: item.resolutionId ?? undefined
      });
    } else {
      await this.queueService.enqueuePrintingJob({
        tenantId: item.tenantId,
        batchJobId: item.batchJobId,
        itemId: item.id,
        sourceFileId: item.sourceFileId ?? undefined,
        prompt: item.prompt ?? undefined,
        aspectRatioId: item.aspectRatioId ?? undefined,
        resolutionId: item.resolutionId ?? undefined
      });
    }

    await this.prisma.batchJobItem.update({
      where: { id: item.id },
      data: {
        status: BatchItemStatus.RETRYING,
        errorMessage: null,
        errorCode: null
      }
    });

    await this.prisma.batchJob.update({
      where: { id: item.batchJobId },
      data: {
        status: BatchJobStatus.RUNNING
      }
    });

    return {
      data: {
        itemId: id,
        retried: true,
        message: "已重新入队。"
      }
    };
  }

  async export(id: string) {
    const batchJob = await this.prisma.batchJob.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            providerTasks: {
              orderBy: {
                createdAt: "desc"
              }
            }
          }
        }
      }
    });

    if (!batchJob) {
      return {
        data: {
          batchJobId: id,
          status: "UNKNOWN",
          exportUrl: null,
          message: "批次不存在。"
        }
      };
    }

    const resultFileIds = batchJob.items
      .map((item) => item.resultFileId)
      .filter((value): value is string => Boolean(value));

    const resultFiles = resultFileIds.length
      ? await this.prisma.fileAsset.findMany({
          where: {
            id: {
              in: resultFileIds
            }
          }
        })
      : [];

    const resultFileMap = new Map(resultFiles.map((file) => [file.id, file]));

    const manifest = {
      batchJobId: batchJob.id,
      name: batchJob.name,
      type: batchJob.type,
      status: batchJob.status,
      exportedAt: new Date().toISOString(),
      items: batchJob.items.map((item) => {
        const providerResult = item.providerTasks.find((task) => task.callbackPayload)?.callbackPayload as
          | { data?: { generateImageId?: string; deductibleAmount?: string } }
          | undefined;

        return {
          itemId: item.id,
          status: item.status,
          step: item.step,
          sourceFileId: item.sourceFileId,
          resultFileId: item.resultFileId,
          resultFileName: item.resultFileId
            ? resultFileMap.get(item.resultFileId)?.fileName ?? null
            : null,
          resultDownloadPath: item.resultFileId
            ? `/api/files/${item.resultFileId}/download`
            : null,
          generateImageId: providerResult?.data?.generateImageId ?? null,
          deductibleAmount: providerResult?.data?.deductibleAmount ?? null,
          errorMessage: item.errorMessage
        };
      })
    };

    const buffer = await this.buildZipBuffer({
      batchJob,
      resultFiles: resultFiles.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        ossKey: file.ossKey,
        mimeType: file.mimeType
      })),
      manifest
    });
    const fileName = `batch-job-${batchJob.id}-results.zip`;
    const uploaded = await this.ossService.putBuffer({
      tenantId: batchJob.tenantId,
      fileName,
      contentType: "application/zip",
      buffer,
      folder: "exports"
    });

    const file = await this.prisma.fileAsset.create({
      data: {
        tenantId: batchJob.tenantId,
        sourceType: FileSourceType.EXPORT,
        fileName,
        ossKey: uploaded.key,
        size: buffer.byteLength,
        mimeType: "application/zip"
      }
    });

    return {
      data: {
        batchJobId: id,
        status: batchJob.status,
        exportUrl: `/api/files/${file.id}/download`,
        message: `已生成 ZIP 导出包，包含 ${resultFiles.length} 个结果文件和 manifest。`
      }
    };
  }

  async exportPrintAsset(itemId: string, dpi: number) {
    const item = await this.prisma.batchJobItem.findUnique({
      where: { id: itemId },
      include: {
        batchJob: true,
        providerTasks: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!item) {
      return {
        data: {
          itemId,
          exportUrl: null,
          message: "任务项不存在。"
        }
      };
    }

    if (!item.resultFileId) {
      return {
        data: {
          itemId,
          exportUrl: null,
          message: "当前任务项还没有可导出的结果文件。"
        }
      };
    }

    const resultFile = await this.prisma.fileAsset.findUnique({
      where: { id: item.resultFileId }
    });

    if (!resultFile) {
      return {
        data: {
          itemId,
          exportUrl: null,
          message: "结果文件记录不存在。"
        }
      };
    }

    const referenceImageId = this.extractGenerateImageId(item.providerTasks);

    if (!referenceImageId) {
      return {
        data: {
          itemId,
          exportUrl: null,
          message: "当前任务项缺少 provider 结果 ID，暂时无法导出打印图。"
        }
      };
    }

    const originalBuffer = await this.ossService.getBuffer(resultFile.ossKey);
    const { width, height } = this.getImageDimensions(originalBuffer);
    const settings = await this.runtimeConfigService.load();
    const callbackUrl = `${settings.chcy.callbackBaseUrl}/api/callbacks/chcyai`;

    const submitResult = await this.chcyAiClient.createPrintAssetTask({
      callbackUrl,
      referenceImageId,
      fileName: resultFile.fileName,
      dpi,
      imageWidth: width,
      imageHeight: height
    });

    let generatedImageId: string | null = null;

    for (let index = 0; index < 12; index += 1) {
      await this.sleep(2000);
      const info = await this.chcyAiClient.getPrintAssetTaskInfo(submitResult.data);
      generatedImageId = info.data.generateImageId ?? null;

      if (generatedImageId) {
        break;
      }
    }

    if (!generatedImageId) {
      return {
        data: {
          itemId,
          exportUrl: null,
          message: `${dpi} DPI 打印图任务已提交，但暂时还未完成。请稍后重试。`
        }
      };
    }

    const download = await this.chcyAiClient.getFileDownloadUrl(generatedImageId);
    const response = await fetch(download.data);

    if (!response.ok) {
      throw new Error(`下载打印图失败：${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const exportedName = resultFile.fileName.replace(/(\.[^.]+)?$/, `-${dpi}dpi$1`);
    const uploaded = await this.ossService.putBuffer({
      tenantId: item.tenantId,
      fileName: exportedName,
      contentType: resultFile.mimeType || "image/png",
      buffer,
      folder: "prints"
    });

    const file = await this.prisma.fileAsset.create({
      data: {
        tenantId: item.tenantId,
        sourceType: FileSourceType.EXPORT,
        fileName: exportedName,
        ossKey: uploaded.key,
        size: buffer.byteLength,
        mimeType: resultFile.mimeType || "image/png",
        providerFileId: generatedImageId
      }
    });

    return {
      data: {
        itemId,
        exportUrl: `/api/files/${file.id}/download`,
        message: `${dpi} DPI 打印图已生成并归档。`
      }
    };
  }

  async syncItemResult(id: string) {
    this.logger.log(`manual sync start itemId=${id}`);
    const item = await this.prisma.batchJobItem.findUnique({
      where: { id },
      include: {
        batchJob: true,
        providerTasks: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!item) {
      this.logger.warn(`manual sync ignored itemId=${id} reason=item_not_found`);
      return {
        data: {
          itemId: id,
          synced: false,
          message: "任务项不存在。"
        }
      };
    }

    const activeTask = item.providerTasks.find((task) =>
      ["SUBMITTED", "CALLBACK_SUCCESS", "POLLED_SUCCESS"].includes(task.status)
    );

    if (!activeTask) {
      this.logger.warn(`manual sync ignored itemId=${id} reason=no_active_provider_task`);
      return {
        data: {
          itemId: id,
          synced: false,
          message: "当前没有可查询的 provider 任务。"
        }
      };
    }

    await this.queueService.enqueuePollingJob(
      {
        tenantId: item.tenantId,
        batchJobId: item.batchJobId,
        itemId: item.id,
        sourceFileId: item.sourceFileId ?? undefined,
        prompt: item.prompt ?? undefined,
        aspectRatioId: item.aspectRatioId ?? undefined,
        resolutionId: item.resolutionId ?? undefined,
        taskType: activeTask.taskType
      },
      0
    );

    this.logger.log(
      `manual sync enqueued itemId=${id} batchJobId=${item.batchJobId} providerTaskId=${activeTask.providerTaskId} taskType=${activeTask.taskType}`
    );

    return {
      data: {
        itemId: id,
        synced: true,
        generateImageId: null,
        message: `已手动触发一次结果查询，providerTaskId=${activeTask.providerTaskId}。请查看 worker 控制台日志并等待几秒后刷新页面。`
      }
    };
  }
}

