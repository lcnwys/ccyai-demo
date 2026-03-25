import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { FilesService } from "./files.service";

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body("tenantId") tenantId = "demo-tenant"
  ) {
    if (!file) {
      throw new BadRequestException("file is required");
    }

    return this.filesService.uploadOriginalFile({
      tenantId,
      fileName: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      buffer: file.buffer
    });
  }

  @Get(":id/download")
  async downloadFile(@Param("id") id: string, @Res() response: Response) {
    const payload = await this.filesService.getDownloadPayload(id);

    if (!payload) {
      throw new NotFoundException("file not found");
    }

    response.setHeader("Content-Type", payload.file.mimeType);
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(payload.file.fileName)}"`
    );
    response.setHeader("Content-Length", payload.buffer.byteLength.toString());
    response.send(payload.buffer);
  }
}
