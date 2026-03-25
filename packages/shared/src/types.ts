export const BatchJobTypes = {
  PRINTING_EXTRACT: "PRINTING_EXTRACT",
  IMAGE_GENERATE: "IMAGE_GENERATE",
  EXTRACT_THEN_GENERATE: "EXTRACT_THEN_GENERATE"
} as const;

export type BatchJobType = (typeof BatchJobTypes)[keyof typeof BatchJobTypes];

export const BatchItemStatuses = {
  PENDING: "PENDING",
  UPLOADING_PROVIDER: "UPLOADING_PROVIDER",
  SUBMITTED: "SUBMITTED",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  RETRYING: "RETRYING"
} as const;

export type BatchItemStatus =
  (typeof BatchItemStatuses)[keyof typeof BatchItemStatuses];

export const QueueNames = {
  PRINTING: "printing-queue",
  IMAGE: "image-queue",
  POLLING: "polling-queue",
  EXPORT: "export-queue"
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

export type BatchJobItemInput = {
  sourceFileId?: string | null;
  prompt?: string;
  aspectRatioId?: number;
  resolutionId?: number;
};

export type BatchJobPayload = {
  tenantId: string;
  name: string;
  type: BatchJobType;
  createdBy: string;
  config?: Record<string, unknown>;
  items: BatchJobItemInput[];
};

export type QueueJobPayload = {
  tenantId: string;
  batchJobId: string;
  itemId: string;
  sourceFileId?: string | null;
  prompt?: string;
  aspectRatioId?: number;
  resolutionId?: number;
  taskType?: "PRINTING" | "IMAGE";
};
