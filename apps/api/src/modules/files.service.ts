import { Injectable } from "@nestjs/common";
import { FileSourceType } from "@prisma/client";
import { OssService } from "./oss.service";
import { PrismaService } from "./prisma.service";

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ossService: OssService
  ) {}

  async uploadOriginalFile(input: {
    tenantId: string;
    fileName: string;
    contentType: string;
    size: number;
    buffer: Buffer;
  }) {
    const uploaded = await this.ossService.putBuffer({
      tenantId: input.tenantId,
      fileName: input.fileName,
      contentType: input.contentType,
      buffer: input.buffer,
      folder: "raw"
    });

    const file = await this.prisma.fileAsset.create({
      data: {
        tenantId: input.tenantId,
        sourceType: FileSourceType.ORIGINAL,
        fileName: input.fileName,
        ossKey: uploaded.key,
        size: input.size,
        mimeType: input.contentType
      }
    });

    return {
      fileId: file.id,
      ossKey: file.ossKey,
      url: uploaded.url
    };
  }

  async getDownloadPayload(fileId: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return null;
    }

    const buffer = await this.ossService.getBuffer(file.ossKey);

    return {
      file,
      buffer
    };
  }
}
