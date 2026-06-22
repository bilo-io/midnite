import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { SearchResponse } from '@midnite/shared';
import type { SearchService } from './search.service';
import { SearchController } from './search.controller';

const response: SearchResponse = {
  results: [
    { type: 'task', id: 't1', title: 'auth', snippet: 'login', route: '/tasks', score: 1 },
  ],
  total: 1,
  byType: { task: 1, project: 0, memory: 0, note: 0, council: 0, workflow: 0 },
};

function build() {
  const service = {
    query: vi.fn(() => response),
    reindex: vi.fn(() => ({ indexed: 7 })),
  } as unknown as SearchService;
  return { controller: new SearchController(service), service };
}

describe('SearchController — GET /search', () => {
  it('parses the query and delegates to the service', () => {
    const { controller, service } = build();
    expect(controller.search({ q: 'auth', limit: '5' })).toEqual(response);
    expect(service.query).toHaveBeenCalledWith({ q: 'auth', limit: 5 });
  });

  it('passes a type filter through', () => {
    const { controller, service } = build();
    controller.search({ q: 'auth', type: 'task' });
    expect(service.query).toHaveBeenCalledWith({ q: 'auth', type: 'task', limit: 20 });
  });

  it('rejects a blank query with 400', () => {
    const { controller } = build();
    expect(() => controller.search({ q: '   ' })).toThrow(BadRequestException);
  });

  it('rejects an unknown type with 400', () => {
    const { controller } = build();
    expect(() => controller.search({ q: 'auth', type: 'comet' })).toThrow(BadRequestException);
  });
});

describe('SearchController — POST /search/reindex', () => {
  it('delegates reindex to the service and returns its count', () => {
    const { controller, service } = build();
    expect(controller.reindex()).toEqual({ indexed: 7 });
    expect(service.reindex).toHaveBeenCalledOnce();
  });
});
