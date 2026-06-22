import { describe, expect, it, vi } from 'vitest';
import type { SearchService } from './search.service';
import { SearchController } from './search.controller';

describe('SearchController', () => {
  it('delegates reindex to the service and returns its count', () => {
    const service = { reindex: vi.fn(() => ({ indexed: 7 })) } as unknown as SearchService;
    const controller = new SearchController(service);
    expect(controller.reindex()).toEqual({ indexed: 7 });
    expect(service.reindex).toHaveBeenCalledOnce();
  });
});
