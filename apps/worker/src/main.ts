import {
  BatchItemStatus,
  BatchItemStep,
  FileSourceType,
  PrismaClient,
  ProviderName,
  ProviderTaskType
} from "@prisma/client";
import { Job, Worker } from "bullmq";
import pino from "pino";
import { QueueJobPayload, QueueNames } from "@chcy/shared";
import { ChcyAiClient } from "./chcy-client";
import { OssClient } from "./oss-client";
import { loadRuntimeSettings } from "./runtime-config";

const logger = pino({ name: "worker" });
const prisma = new PrismaClient();
const chcy = new ChcyAiClient();
const oss = new OssClient();
const redisConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null as null
};

type ChcyCredentials = {
  accessKey?: string;
  secretKey?: string;
};

function safeJobId(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join("__");
}

function uniquePollingJobId(...parts: Array<string | undefined>) {
  return `${safeJobId(...parts)}__${Date.now()}__${Math.random().toString(36).slice(2, 8)}`;
}

async function resolveChcyCredentialsForUser(userId: string): Promise<ChcyCredentials | undefined> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user?.chcyAccessKey && user?.chcySecretKey) {
    return {
      accessKey: user.chcyAccessKey,
      secretKey: user.chcySecretKey
    };
  }

  return undefined;
}

async function enqueuePolling(payload: QueueJobPayload, delay = 20000) {
  const { Queue } = await import("bullmq");
  const queue = new Queue(QueueNames.POLLING, {
    connection: redisConnection
  });

  await queue.add("provider.polling", payload, {
    delay,
    attempts: 10,
    removeOnComplete: 1000,
    removeOnFail: 1000,
    backoff: {
      type: "fixed",
      delay: 10000
    },
    jobId: uniquePollingJobId(
      payload.batchJobId,
      payload.itemId,
      payload.taskType ?? "unknown",
      "poll"
    )
  });

  await queue.close();
}

async function refreshBatchJob(batchJobId: string) {
  const successCount = await prisma.batchJobItem.count({
    where: {
      batchJobId,
      status: BatchItemStatus.SUCCESS
    }
  });

  const failedCount = await prisma.batchJobItem.count({
    where: {
      batchJobId,
      status: BatchItemStatus.FAILED
    }
  });

  const totalCount = await prisma.batchJobItem.count({
    where: { batchJobId }
  });

  await prisma.batchJob.update({
    where: { id: batchJobId },
    data: {
      successCount,
      failedCount,
      status:
        successCount === totalCount
          ? "SUCCESS"
          : failedCount > 0
            ? "PARTIAL_SUCCESS"
            : "RUNNING"
    }
  });
}

async function ensureProviderFileId(fileId: string, credentials?: ChcyCredentials) {
  const file = await prisma.fileAsset.findUnique({ where: { id: fileId } });
  if (!file) {
    throw new Error(`source file not found: ${fileId}`);
  }

  if (file.providerFileId) {
    return { file, providerFileId: file.providerFileId };
  }

  const buffer = await oss.getBuffer(file.ossKey);
  const upload = await chcy.uploadFile(
    {
      fileName: file.fileName,
      contentType: file.mimeType,
      buffer
    },
    credentials
  );

  await prisma.fileAsset.update({
    where: { id: file.id },
    data: { providerFileId: upload.data }
  });

  return { file, providerFileId: upload.data };
}

function inferExtension(input: { contentType?: string | null; url?: string }) {
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

function extractGenerateImageId(result: unknown) {
  const payload = result as { data?: { generateImageId?: string } } | null;
  return payload?.data?.generateImageId;
}

async function persistResultFile(
  input: {
    itemId: string;
    tenantId: string;
    generateImageId?: string;
    sourceType: FileSourceType;
    fileNamePrefix: string;
    folder: string;
  },
  credentials?: ChcyCredentials
) {
  if (!input.generateImageId) {
    return null;
  }

  const item = await prisma.batchJobItem.findUnique({ where: { id: input.itemId } });

  if (!item) {
    throw new Error(`batch item not found: ${input.itemId}`);
  }

  const fileInfo = await chcy.getFileDownloadUrl(input.generateImageId, credentials);
  const downloadUrl = fileInfo.data;
  const downloadResponse = await fetch(downloadUrl);

  if (!downloadResponse.ok) {
    throw new Error(`download result failed: ${downloadResponse.status} ${await downloadResponse.text()}`);
  }

  const contentType = downloadResponse.headers.get("content-type") ?? "image/png";
  const extension = inferExtension({
    contentType,
    url: downloadUrl
  });
  const buffer = Buffer.from(await downloadResponse.arrayBuffer());
  const fileName = `${input.fileNamePrefix}-${item.id}.${extension}`;
  const uploaded = await oss.putBuffer({
    tenantId: input.tenantId,
    fileName,
    contentType,
    buffer,
    folder: input.folder
  });

  const asset = await prisma.fileAsset.create({
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

  await prisma.batchJobItem.update({
    where: { id: item.id },
    data: {
      resultFileId: asset.id
    }
  });

  return asset;
}

async function handlePrinting(job: Job<QueueJobPayload>) {
  if (!job.data.sourceFileId) {
    throw new Error("印花提取任务缺少原图，无法提交。");
  }

  const item = await prisma.batchJobItem.findUnique({
    where: { id: job.data.itemId },
    include: {
      batchJob: true
    }
  });
  if (!item) {
    throw new Error(`batch item not found: ${job.data.itemId}`);
  }

  const credentials = await resolveChcyCredentialsForUser(item.batchJob.createdBy);

  await prisma.batchJobItem.update({
    where: { id: item.id },
    data: { status: BatchItemStatus.UPLOADING_PROVIDER }
  });

  const { file, providerFileId } = await ensureProviderFileId(job.data.sourceFileId, credentials);
  const settings = await loadRuntimeSettings();
  const callbackUrl = `${settings.chcy?.callbackBaseUrl ?? process.env.CHCY_CALLBACK_BASE_URL}/api/callbacks/chcyai`;
  const taskResponse = await chcy.createPrintingTask(
    {
      callbackUrl,
      referenceImageId: providerFileId,
      fileName: file.fileName,
      prompt: item.prompt ?? undefined,
      resolutionRatioId: item.resolutionId ?? 1,
      isPatternCompleted: 1
    },
    credentials
  );

  await prisma.providerTask.create({
    data: {
      batchJobItemId: item.id,
      provider: ProviderName.CHCYAI,
      taskType: ProviderTaskType.PRINTING,
      providerTaskId: taskResponse.data,
      requestPayload: {
        callbackUrl,
        referenceImageId: providerFileId,
        prompt: item.prompt,
        resolutionRatioId: item.resolutionId ?? 1,
        isPatternCompleted: 1
      },
      responsePayload: taskResponse,
      status: "SUBMITTED"
    }
  });

  await prisma.batchJobItem.update({
    where: { id: item.id },
    data: {
      status: BatchItemStatus.PROCESSING,
      step: BatchItemStep.EXTRACT
    }
  });

  await enqueuePolling({
    ...job.data,
    taskType: "PRINTING"
  });

  logger.info({ itemId: item.id, taskId: taskResponse.data }, "printing task submitted");
}

async function handleImage(job: Job<QueueJobPayload>) {
  const item = await prisma.batchJobItem.findUnique({
    where: { id: job.data.itemId },
    include: {
      providerTasks: true,
      batchJob: true
    }
  });

  if (!item) {
    throw new Error(`batch item not found: ${job.data.itemId}`);
  }

  const credentials = await resolveChcyCredentialsForUser(item.batchJob.createdBy);

  let referenceImageId: string | undefined;
  const printingTask = item.providerTasks.find((task) => task.taskType === ProviderTaskType.PRINTING);
  const callbackData = printingTask?.callbackPayload as { data?: { generateImageId?: string } } | null;
  referenceImageId = callbackData?.data?.generateImageId;

  if (!referenceImageId && item.sourceFileId) {
    const ensured = await ensureProviderFileId(item.sourceFileId, credentials);
    referenceImageId = ensured.providerFileId;
  }

  const settings = await loadRuntimeSettings();
  const callbackUrl = `${settings.chcy?.callbackBaseUrl ?? process.env.CHCY_CALLBACK_BASE_URL}/api/callbacks/chcyai`;
  const capability = (item.batchJob.configJson as { capability?: string; similarity?: number } | null)?.capability;
  const itemOptions = (item.optionsJson as { similarity?: number } | null) ?? null;
  const similarity =
    itemOptions?.similarity ??
    (item.batchJob.configJson as { capability?: string; similarity?: number } | null)?.similarity ??
    0.72;

  if (capability === "fission" && !referenceImageId) {
    throw new Error("图裂变任务必须提供参考图。");
  }

  const taskResponse =
    capability === "fission"
      ? await chcy.createFissionTask(
          {
            callbackUrl,
            prompt: item.prompt ?? "围绕当前主题进行多版本裂变，保留主视觉气质和商业可用性",
            fileName: undefined,
            referenceImageId: referenceImageId!,
            similarity,
            resolutionRatioId: item.resolutionId ?? 1,
            aspectRatio: item.aspectRatioId ?? 0
          },
          credentials
        )
      : await chcy.createImageTask(
          {
            callbackUrl,
            prompt: item.prompt ?? "请生成高质量图像",
            referenceImageIdList: referenceImageId ? [referenceImageId] : undefined,
            aspectRatioId: item.aspectRatioId ?? undefined,
            resolutionRatioId: item.resolutionId ?? 1
          },
          credentials
        );

  await prisma.providerTask.create({
    data: {
      batchJobItemId: item.id,
      provider: ProviderName.CHCYAI,
      taskType: ProviderTaskType.IMAGE,
      providerTaskId: taskResponse.data,
      requestPayload: {
        callbackUrl,
        prompt: item.prompt,
        aspectRatioId: item.aspectRatioId ?? 0,
        resolutionRatioId: item.resolutionId ?? 1,
        referenceImageIdList: referenceImageId ? [referenceImageId] : [],
        capability,
        similarity
      },
      responsePayload: taskResponse,
      status: "SUBMITTED"
    }
  });

  await prisma.batchJobItem.update({
    where: { id: item.id },
    data: {
      status: BatchItemStatus.PROCESSING,
      step: BatchItemStep.GENERATE
    }
  });

  await enqueuePolling({
    ...job.data,
    taskType: "IMAGE"
  });

  logger.info({ itemId: item.id, taskId: taskResponse.data }, "image task submitted");
}

async function handlePolling(job: Job<QueueJobPayload>) {
  logger.info(
    {
      itemId: job.data.itemId,
      batchJobId: job.data.batchJobId,
      taskType: job.data.taskType
    },
    "polling started"
  );

  const item = await prisma.batchJobItem.findUnique({
    where: { id: job.data.itemId },
    include: {
      batchJob: true,
      providerTasks: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!item) {
    throw new Error(`batch item not found: ${job.data.itemId}`);
  }

  const credentials = await resolveChcyCredentialsForUser(item.batchJob.createdBy);

  const activeTask = item.providerTasks.find(
    (task) =>
      (
        task.status === "SUBMITTED" ||
        task.status === "CALLBACK_SUCCESS" ||
        task.status === "POLLED_SUCCESS" ||
        task.status === "MANUAL_SYNC_SUCCESS" ||
        task.status === "POLLING_FAILED"
      ) &&
      (job.data.taskType ? task.taskType === job.data.taskType : true)
  );

  if (!activeTask) {
    logger.info(
      {
        itemId: job.data.itemId,
        batchJobId: job.data.batchJobId,
        taskType: job.data.taskType
      },
      "polling skipped because no active provider task was found"
    );
    return;
  }

  try {
    const result =
      activeTask.taskType === ProviderTaskType.PRINTING
        ? await chcy.getPrintingTaskInfo(activeTask.providerTaskId, credentials)
        : ((item.batchJob.configJson as { capability?: string } | null)?.capability === "fission"
            ? await chcy.getFissionTaskInfo(activeTask.providerTaskId, credentials)
            : await chcy.getImageTaskInfo(activeTask.providerTaskId, credentials));

    await prisma.providerTask.update({
      where: { id: activeTask.id },
      data: {
        status: "POLLED_SUCCESS",
        callbackPayload: result
      }
    });

    logger.info(
      {
        itemId: item.id,
        providerTaskId: activeTask.providerTaskId,
        taskType: activeTask.taskType,
        generateImageId: extractGenerateImageId(result) ?? null
      },
      "polling received provider result"
    );

    if (activeTask.taskType === ProviderTaskType.PRINTING) {
      const generateImageId = extractGenerateImageId(result);

      if (generateImageId && item.batchJob.type !== "EXTRACT_THEN_GENERATE") {
        await persistResultFile(
          {
            itemId: item.id,
            tenantId: item.tenantId,
            generateImageId,
            sourceType: FileSourceType.EXTRACTED,
            fileNamePrefix: "extracted",
            folder: "extracted"
          },
          credentials
        );
      }

      await prisma.batchJobItem.update({
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
        const imageReferenceId = extractGenerateImageId(result);
        const settings = await loadRuntimeSettings();

        const taskResponse = await chcy.createImageTask(
          {
            callbackUrl: `${settings.chcy?.callbackBaseUrl ?? process.env.CHCY_CALLBACK_BASE_URL}/api/callbacks/chcyai`,
            prompt: item.prompt ?? "保留主体风格，生成适合跨境电商使用的高质量印花图案",
            referenceImageIdList: imageReferenceId ? [imageReferenceId] : undefined,
            aspectRatioId: item.aspectRatioId ?? 0,
            resolutionRatioId: item.resolutionId ?? 1
          },
          credentials
        );

        await prisma.providerTask.create({
          data: {
            batchJobItemId: item.id,
            provider: ProviderName.CHCYAI,
            taskType: ProviderTaskType.IMAGE,
            providerTaskId: taskResponse.data,
            requestPayload: {
              referenceImageIdList: imageReferenceId ? [imageReferenceId] : [],
              prompt: item.prompt
            },
            responsePayload: taskResponse,
            status: "SUBMITTED"
          }
        });

        await enqueuePolling(
          {
            ...job.data,
            taskType: "IMAGE"
          },
          30000
        );
      }
    } else {
      await persistResultFile(
        {
          itemId: item.id,
          tenantId: item.tenantId,
          generateImageId: extractGenerateImageId(result),
          sourceType: FileSourceType.GENERATED,
          fileNamePrefix: "generated",
          folder: "generated"
        },
        credentials
      );

      await prisma.batchJobItem.update({
        where: { id: item.id },
        data: {
          status: BatchItemStatus.SUCCESS,
          step: BatchItemStep.DONE
        }
      });
    }

    await refreshBatchJob(item.batchJobId);
  } catch (error) {
    const retryCount = activeTask.retryCount + 1;

    logger.error(
      {
        itemId: item.id,
        providerTaskId: activeTask.providerTaskId,
        taskType: activeTask.taskType,
        retryCount,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      },
      "polling query failed"
    );

    if (retryCount >= 10) {
      await prisma.providerTask.update({
        where: { id: activeTask.id },
        data: {
          retryCount,
          status: "POLLING_FAILED"
        }
      });

      await prisma.batchJobItem.update({
        where: { id: item.id },
        data: {
          status: BatchItemStatus.FAILED,
          errorMessage: String(error)
        }
      });

      await refreshBatchJob(item.batchJobId);
      throw error;
    }

    await prisma.providerTask.update({
      where: { id: activeTask.id },
      data: {
        retryCount
      }
    });

    await enqueuePolling(job.data, 30000);
  }
}

async function bootstrap() {
  await prisma.$connect();

  const printingWorker = new Worker(QueueNames.PRINTING, handlePrinting, {
    connection: redisConnection,
    concurrency: 5
  });

  const imageWorker = new Worker(QueueNames.IMAGE, handleImage, {
    connection: redisConnection,
    concurrency: 5
  });

  const pollingWorker = new Worker(QueueNames.POLLING, handlePolling, {
    connection: redisConnection,
    concurrency: 3
  });

  printingWorker.on("failed", async (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      },
      "printing job failed"
    );
    if (job?.data?.itemId) {
      await prisma.batchJobItem.update({
        where: { id: job.data.itemId },
        data: {
          status: BatchItemStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  });

  imageWorker.on("failed", async (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      },
      "image job failed"
    );
    if (job?.data?.itemId) {
      await prisma.batchJobItem.update({
        where: { id: job.data.itemId },
        data: {
          status: BatchItemStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  });

  pollingWorker.on("failed", async (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      },
      "polling job failed"
    );
  });

  logger.info("worker online");
}

bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});
