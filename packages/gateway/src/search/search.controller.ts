import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { SearchQuerySchema, type SearchResponse } from '@midnite/shared';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly service: SearchService) {}

  // Ranked cross-entity search. Query params (`q`, optional `type`, `limit`)
  // arrive as strings; the shared schema coerces/validates them. A too-short `q`
  // returns the empty response from the service (no index scan).
  @Get()
  search(@Query() query: unknown): SearchResponse {
    const parsed = SearchQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.query(parsed.data);
  }

  // Rebuild the whole index from scratch — recovery / after a mapping change.
  // Idempotent, so 200 (not 201).
  @Post('reindex')
  @HttpCode(200)
  reindex(): { indexed: number } {
    return this.service.reindex();
  }
}
