import { Global, Module } from '@nestjs/common';
import { SearchIndexService } from './search-index.service';

// Global so every domain service can maintain its own index rows on the
// write-path without importing the search module (which would invert the
// dependency — the search module imports the domains for backfill). Mirrors the
// `@Global()` `DbModule` it sits beside.
@Global()
@Module({
  providers: [SearchIndexService],
  exports: [SearchIndexService],
})
export class SearchIndexModule {}
