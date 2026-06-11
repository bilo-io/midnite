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
  CreateMemoryRequestSchema,
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

  @Post()
  createMemory(@Body() body: unknown): MemoryResponse {
    const parsed = CreateMemoryRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { memory: this.service.createMemory(parsed.data) };
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
}
