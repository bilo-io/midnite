import { BadRequestException, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import {
  SearchQuerySchema,
  type ReindexResponse,
  type SearchResponse,
} from '@midnite/shared';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly service: SearchService) {}

  @Get()
  search(@Query() query: unknown): SearchResponse {
    const parsed = SearchQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.search(parsed.data);
  }

  /** Admin: rebuild the index from scratch (recovery / schema changes). */
  @Post('reindex')
  reindex(): ReindexResponse {
    return { indexed: this.service.reindex() };
  }
}
