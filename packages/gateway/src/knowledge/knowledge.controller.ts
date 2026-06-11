import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { AddGlobalSourceRequestSchema, type GlobalSourcesResponse } from '@midnite/shared';
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

  @Delete('sources/:id')
  removeSource(@Param('id') id: string): GlobalSourcesResponse {
    return { sources: this.service.removeSource(id) };
  }
}
