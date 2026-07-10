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
} from '@nestjs/common';
import {
  AddMemorySourceRequestSchema,
  CreateMemoryRequestSchema,
  ReorderSourcesRequestSchema,
  UpdateMemoryRequestSchema,
  type MemoriesResponse,
  type MemoryResponse,
} from '@midnite/shared';
import { MemoriesService } from './memories.service';

@Controller('memories')
export class MemoriesController {
  constructor(@Inject(MemoriesService) private readonly service: MemoriesService) {}

  @Get()
  listMemories(): MemoriesResponse {
    return { memories: this.service.listMemories() };
  }

  // The detail page (Phase 65 A) fetches a single memory by id; the service
  // throws NotFoundException → 404 for an unknown id.
  @Get(':id')
  getMemory(@Param('id') id: string): MemoryResponse {
    return { memory: this.service.getMemory(id) };
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

  @Delete(':id/sources/:sourceId')
  removeSource(@Param('id') id: string, @Param('sourceId') sourceId: string): MemoryResponse {
    return { memory: this.service.removeSource(id, sourceId) };
  }
}
