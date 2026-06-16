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
import { isAbsolute, join, resolve } from 'node:path';
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
    const filePath = this.service.getFilePath(id);
    const row = this.service['repo'].get(id)!;

    let absolutePath: string;
    if (isAbsolute(filePath)) {
      absolutePath = filePath;
    } else {
      const uploadsDir = (this.config as unknown as { gateway?: { uploadsDir?: string } }).gateway?.uploadsDir;
      const base = uploadsDir ? resolve(uploadsDir) : resolve(process.cwd(), 'uploads');
      absolutePath = join(base, filePath);
    }

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('file not found on disk');
    }

    const stream = createReadStream(absolutePath);
    void reply.header('content-type', row.mimeType || 'application/octet-stream').send(stream);
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
