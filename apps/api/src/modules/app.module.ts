import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { BatchJobsController } from "./batch-jobs.controller";
import { BatchJobsService } from "./batch-jobs.service";
import { CallbackAuditController } from "./callback-audit.controller";
import { CallbackAuditService } from "./callback-audit.service";
import { CallbackController } from "./callback.controller";
import { CallbackService } from "./callback.service";
import { ChcyAiClient } from "./chcyai.client";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { HealthController } from "./health.controller";
import { OssService } from "./oss.service";
import { PrismaService } from "./prisma.service";
import { QueueService } from "./queue.service";
import { RuntimeConfigService } from "./runtime-config.service";
import { RuntimeSettingsController } from "./runtime-settings.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot()
  ],
  controllers: [
    HealthController,
    AuthController,
    FilesController,
    BatchJobsController,
    CallbackController,
    CallbackAuditController,
    RuntimeSettingsController
  ],
  providers: [
    PrismaService,
    OssService,
    FilesService,
    BatchJobsService,
    QueueService,
    AuthService,
    ChcyAiClient,
    CallbackService,
    CallbackAuditService,
    RuntimeConfigService
  ]
})
export class AppModule {}
