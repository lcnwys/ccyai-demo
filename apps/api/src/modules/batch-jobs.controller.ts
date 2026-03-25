import { Body, Controller, Get, Logger, Param, Post } from "@nestjs/common";
import { BatchJobsService, CreateBatchJobDto } from "./batch-jobs.service";

@Controller("batch-jobs")
export class BatchJobsController {
  private readonly logger = new Logger(BatchJobsController.name);

  constructor(private readonly batchJobsService: BatchJobsService) {}

  @Get()
  list() {
    return this.batchJobsService.list();
  }

  @Post()
  create(@Body() body: CreateBatchJobDto) {
    return this.batchJobsService.create(body);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.batchJobsService.detail(id);
  }

  @Post(":id/export")
  export(@Param("id") id: string) {
    return this.batchJobsService.export(id);
  }

  @Post(":id/retry")
  retry(@Param("id") id: string) {
    return this.batchJobsService.retry(id);
  }

  @Post("items/:id/retry")
  retryItem(@Param("id") id: string) {
    return this.batchJobsService.retryItem(id);
  }

  @Post("items/:id/print-export")
  printExportItem(
    @Param("id") id: string,
    @Body() body: { dpi: number }
  ) {
    return this.batchJobsService.exportPrintAsset(id, body.dpi);
  }

  @Post("items/:id/sync-result")
  syncItemResult(@Param("id") id: string) {
    this.logger.log(`manual sync requested itemId=${id}`);
    return this.batchJobsService.syncItemResult(id);
  }
}
