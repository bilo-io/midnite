import { Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly service: SearchService) {}

  // Rebuild the whole index from scratch — recovery / after a mapping change.
  // Idempotent, so 200 (not 201). (`GET /search` arrives in Theme B.)
  @Post('reindex')
  @HttpCode(200)
  reindex(): { indexed: number } {
    return this.service.reindex();
  }
}
