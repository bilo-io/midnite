import type { SearchIndexService } from '../search/search-index.service';

/**
 * A no-op {@link SearchIndexService} for unit tests that construct a domain
 * service directly. Those specs assert domain behaviour, not index maintenance
 * (which is covered in `search-index.service.test.ts` and the backfill spec), so
 * the index calls are harmless no-ops here.
 */
export function fakeSearchIndex(): SearchIndexService {
  return {
    upsert: () => {},
    remove: () => {},
    query: () => [],
    count: () => 0,
    clear: () => {},
    indexAll: () => {},
  } as unknown as SearchIndexService;
}
