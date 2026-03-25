import { Body, Controller, Get, Headers, Logger, Param, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { BatchJobsService, CreateBatchJobDto } from "./batch-jobs.service";

@Controller("batch-jobs")
export class BatchJobsController {
  private readonly logger = new Logger(BatchJobsController.name);

  constructor(
    private readonly batchJobsService: BatchJobsService,
    private readonly authService: AuthService
  ) {}

  @Get()
  async list(@Headers("authorization") authorization?: string) {
    const currentUser = await this.authService.getCurrentUser(authorization);
    return this.batchJobsService.list(currentUser);
  }

  @Post()
  async create(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: CreateBatchJobDto
  ) {
    const currentUser = await this.authService.getCurrentUser(authorization);
    return this.batchJobsService.create(body, currentUser);
  }

  @Get(":id")
  async detail(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string
  ) {
    const currentUser = await this.authService.getCurrentUser(authorization);
    return this.batchJobsService.detail(id, currentUser);
  }

  @Post(":id/export")
  async export(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string
  ) {
    const currentUser = await this.authService.getCurrentUser(authorization);
    return this.batchJobsService.export(id, currentUser);
  }

  @Post(":id/retry")
  async retry(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string
  ) {
    const currentUser = await this.authService.getCurrentUser(authorization);
    return this.batchJobsService.retry(id, currentUser);
  }

  @Post("items/:id/retry")
  async retryItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string
  ) {
    const currentUser = await this.authService.getCurrentUser(authorization);
    return this.batchJobsService.retryItem(id, currentUser);
  }

  @Post("items/:id/print-export")
  async printExportItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { dpi: number }
  ) {
    const currentUser = await this.authService.getCurrentUser(authorization);
    return this.batchJobsService.exportPrintAsset(id, body.dpi, currentUser);
  }

  @Post("items/:id/sync-result")
  async syncItemResult(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string
  ) {
    this.logger.log(`manual sync requested itemId=${id}`);
    const currentUser = await this.authService.getCurrentUser(authorization);
    return this.batchJobsService.syncItemResult(id, currentUser);
  }
}
