import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import type { FastifyReply } from 'fastify';
import {
  CreateMediaBodySchema,
  MediaTypeSchema,
  UpdateMediaBodySchema,
  type MediaListResponse,
  type MediaResponse,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import type { MidniteConfig } from '@midnite/shared';
import { resolveMediaPath } from './lib/resolve-media-path';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(
    @Inject(MediaService) private readonly service: MediaService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {}

  @Get()
  listMedia(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
  ): MediaListResponse {
    const parsedType = type ? MediaTypeSchema.safeParse(type) : null;
    if (parsedType && !parsedType.success) throw new BadRequestException('invalid type');
    return { items: this.service.listMedia(projectId, parsedType?.data) };
  }

  @Post()
  createMedia(@Body() body: unknown): MediaResponse {
    const parsed = CreateMediaBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { media: this.service.createMedia(parsed.data) };
  }

  @Get(':id/file')
  serveFile(@Param('id') id: string, @Res({ passthrough: false }) reply: FastifyReply): void {
    const { filePath, mimeType } = this.service.getFileMeta(id);

    // Re-confine the stored (untrusted) path to the uploads dir — the write-time
    // schema guard rejects traversal, but a legacy/imported row must not be able
    // to read arbitrary files off disk (Phase 60 C).
    const uploadsDir = (this.config as unknown as { gateway?: { uploadsDir?: string } }).gateway
      ?.uploadsDir;
    const absolutePath = resolveMediaPath(filePath, uploadsDir);
    if (!absolutePath) {
      throw new BadRequestException('invalid media path');
    }

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('file not found on disk');
    }

    const stream = createReadStream(absolutePath);
    void reply.header('content-type', mimeType || 'application/octet-stream').send(stream);
  }

  @Get(':id')
  getMedia(@Param('id') id: string): MediaResponse {
    return { media: this.service.getMedia(id) };
  }

  @Patch(':id')
  updateMedia(@Param('id') id: string, @Body() body: unknown): MediaResponse {
    const parsed = UpdateMediaBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { media: this.service.updateMedia(id, parsed.data) };
  }

  @Delete(':id')
  deleteMedia(@Param('id') id: string): { ok: true } {
    this.service.deleteMedia(id);
    return { ok: true };
  }

  @Post(':id/generate')
  generateMedia(@Param('id') id: string): never {
    return this.service.generateMedia(id);
  }
}
