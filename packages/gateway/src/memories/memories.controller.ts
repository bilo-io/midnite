import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  AddMemorySourceRequestSchema,
  CreateMemoryRequestSchema,
  ReorderSourcesRequestSchema,
  UpdateMemoryRequestSchema,
  type MemoriesResponse,
  type MemoryResponse,
} from '@midnite/shared';
import { MemoriesService, type MemoryFileUpload } from './memories.service';

@Controller('memories')
export class MemoriesController {
  constructor(@Inject(MemoriesService) private readonly service: MemoriesService) {}

  @Get()
  listMemories(): MemoriesResponse {
    return { memories: this.service.listMemories() };
  }

  // The detail page (Phase 65 A) fetches a single memory by id; the service
  // throws NotFoundException → 404 for an unknown id. Opening it also lazily
  // kicks ingestion for any not-yet-ingested sources (Phase 65 B rollout).
  @Get(':id')
  getMemory(@Param('id') id: string): MemoryResponse {
    const memory = this.service.getMemory(id);
    this.service.backfillIngestion(id);
    return { memory };
  }

  @Post()
  async createMemory(@Body() body: unknown): Promise<MemoryResponse> {
    const parsed = CreateMemoryRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { memory: await this.service.createMemory(parsed.data) };
  }

  @Patch(':id')
  updateMemory(@Param('id') id: string, @Body() body: unknown): MemoryResponse {
    const parsed = UpdateMemoryRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { memory: this.service.updateMemory(id, parsed.data) };
  }

  @Delete(':id')
  removeMemory(@Param('id') id: string): { ok: true } {
    this.service.removeMemory(id);
    return { ok: true };
  }

  @Post(':id/sources')
  async addSource(@Param('id') id: string, @Body() body: unknown): Promise<MemoryResponse> {
    const parsed = AddMemorySourceRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { memory: await this.service.addSource(id, parsed.data.url) };
  }

  // Static segment, so it never collides with `:sourceId` below.
  @Post(':id/sources/reorder')
  reorderSources(@Param('id') id: string, @Body() body: unknown): MemoryResponse {
    const parsed = ReorderSourcesRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { memory: this.service.reorderSources(id, parsed.data.sourceIds) };
  }

  // Static segment (before `:sourceId`) — upload a file as a source (Phase 65 B).
  @Post(':id/sources/file')
  async addFileSource(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ): Promise<MemoryResponse> {
    const upload = await readFileUpload(req);
    return { memory: await this.service.addFileSource(id, upload) };
  }

  @Post(':id/sources/:sourceId/reingest')
  reingestSource(
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
  ): MemoryResponse {
    return { memory: this.service.reingestSource(id, sourceId) };
  }

  @Delete(':id/sources/:sourceId')
  removeSource(@Param('id') id: string, @Param('sourceId') sourceId: string): MemoryResponse {
    return { memory: this.service.removeSource(id, sourceId) };
  }
}

/** Read a single `file` part from a multipart upload (mirrors portability.controller). */
async function readFileUpload(req: FastifyRequest): Promise<MemoryFileUpload> {
  if (!req.isMultipart()) {
    throw new BadRequestException('expected multipart/form-data with a "file" part');
  }
  let upload: MemoryFileUpload | undefined;
  for await (const part of req.parts()) {
    if (part.type === 'file') {
      if (part.fieldname === 'file' && !upload) {
        upload = {
          buffer: await part.toBuffer(),
          fileName: part.filename || 'upload',
          mimeType: part.mimetype || 'application/octet-stream',
        };
      } else {
        await part.toBuffer(); // drain other file parts so the stream completes
      }
    }
  }
  if (!upload) throw new BadRequestException('missing "file" part');
  return upload;
}
