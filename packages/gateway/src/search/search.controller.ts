import { BadRequestException, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import {
  SearchQuerySchema,
  type ReindexResponse,
  type SearchResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly service: SearchService) {}

  @Get()
  search(
    @Query() query: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): SearchResponse {
    const parsed = SearchQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    // Scope to the requesting user's team when authenticated; no filter for
    // legacy static-token requests (user is undefined).
    const scope = user ? { teamId: user.teamId ?? null } : undefined;
    return this.service.search(parsed.data, scope);
  }

  /** Admin: rebuild the index from scratch (recovery / schema changes). */
  @Post('reindex')
  reindex(): ReindexResponse {
    return { indexed: this.service.reindex() };
  }
}
