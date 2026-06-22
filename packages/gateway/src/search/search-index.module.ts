import { Global, Module } from '@nestjs/common';
import { SearchIndexService } from './search-index.service';

/**
 * The index maintainer is global so any domain service can inject it to keep its
 * own rows fresh, without each domain module wiring an import (mirrors how the
 * DB handle is provided). The querying/backfill layer lives in `SearchModule`.
 */
@Global()
@Module({
  providers: [SearchIndexService],
  exports: [SearchIndexService],
})
export class SearchIndexModule {}
