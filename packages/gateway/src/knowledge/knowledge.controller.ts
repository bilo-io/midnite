import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import {
  AddGlobalSourceRequestSchema,
  ReorderSourcesRequestSchema,
  type GlobalSourcesResponse,
} from '@midnite/shared';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(@Inject(KnowledgeService) private readonly service: KnowledgeService) {}

  @Get('sources')
  listSources(): GlobalSourcesResponse {
    return { sources: this.service.listSources() };
  }

  @Post('sources')
  async addSource(@Body() body: unknown): Promise<GlobalSourcesResponse> {
    const parsed = AddGlobalSourceRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { sources: await this.service.addSource(parsed.data.url) };
  }

  // Static segment, so it never collides with `:id` below.
  @Post('sources/reorder')
  reorderSources(@Body() body: unknown): GlobalSourcesResponse {
    const parsed = ReorderSourcesRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { sources: this.service.reorderSources(parsed.data.sourceIds) };
  }

  @Delete('sources/:id')
  removeSource(@Param('id') id: string): GlobalSourcesResponse {
    return { sources: this.service.removeSource(id) };
  }
}
