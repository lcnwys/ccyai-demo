import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import { QueueJobPayload, QueueNames } from "@chcy/shared";

const redisConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null as null
};

function safeJobId(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join("__");
}

function uniquePollingJobId(...parts: Array<string | undefined>) {
  return `${safeJobId(...parts)}__${Date.now()}__${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  private readonly printingQueue = new Queue(QueueNames.PRINTING, {
    connection: redisConnection
  });

  private readonly imageQueue = new Queue(QueueNames.IMAGE, {
    connection: redisConnection
  });

  private readonly pollingQueue = new Queue(QueueNames.POLLING, {
    connection: redisConnection
  });

  async enqueuePrintingJob(payload: QueueJobPayload) {
    await this.printingQueue.add("printing.extract", payload, {
      attempts: 3,
      removeOnComplete: 1000,
      removeOnFail: 1000,
      backoff: {
        type: "exponential",
        delay: 3000
      },
      jobId: safeJobId(payload.batchJobId, payload.itemId, "extract")
    });

    this.logger.log(`Enqueued printing job for item ${payload.itemId}`);
  }

  async enqueueImageJob(payload: QueueJobPayload) {
    await this.imageQueue.add("image.generate", payload, {
      attempts: 3,
      removeOnComplete: 1000,
      removeOnFail: 1000,
      backoff: {
        type: "exponential",
        delay: 3000
      },
      jobId: safeJobId(payload.batchJobId, payload.itemId, "image")
    });

    this.logger.log(`Enqueued image job for item ${payload.itemId}`);
  }

  async enqueuePollingJob(payload: QueueJobPayload, delay = 20000) {
    const jobId = uniquePollingJobId(
      payload.batchJobId,
      payload.itemId,
      payload.taskType ?? "unknown",
      "poll"
    );

    await this.pollingQueue.add("provider.polling", payload, {
      delay,
      attempts: 10,
      removeOnComplete: 1000,
      removeOnFail: 1000,
      backoff: {
        type: "fixed",
        delay: 10000
      },
      jobId
    });

    this.logger.log(
      `Enqueued polling job itemId=${payload.itemId} batchJobId=${payload.batchJobId} taskType=${payload.taskType ?? "unknown"} delay=${delay} jobId=${jobId}`
    );
  }

  async onModuleDestroy() {
    await this.printingQueue.close();
    await this.imageQueue.close();
    await this.pollingQueue.close();
  }
}

