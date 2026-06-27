import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEARCH_LIMIT,
  EMPTY_SEARCH_RESPONSE,
  MAX_SEARCH_LIMIT,
  SEARCH_TYPES,
  SearchQuerySchema,
  SearchResponseSchema,
  SearchResultSchema,
} from './search.js';

describe('SearchResultSchema', () => {
  const valid = {
    type: 'task' as const,
    id: 't1',
    title: 'Fix OAuth login',
    snippet: 'the <mark>OAuth</mark> flow',
    route: '/tasks',
    score: 1.23,
  };

  it('accepts a well-formed result', () => {
    expect(SearchResultSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an unknown type', () => {
    expect(SearchResultSchema.safeParse({ ...valid, type: 'widget' }).success).toBe(false);
  });

  it('covers exactly the seven searchable domains', () => {
    expect([...SEARCH_TYPES]).toEqual(['task', 'project', 'memory', 'note', 'council', 'workflow', 'idea']);
  });
});

describe('SearchResponseSchema', () => {
  it('parses results + total + per-type counts', () => {
    const parsed = SearchResponseSchema.parse({
      results: [],
      total: 3,
      byType: { task: 2, note: 1 },
    });
    expect(parsed.byType.task).toBe(2);
    expect(parsed.total).toBe(3);
  });

  it('treats the empty response as valid', () => {
    expect(SearchResponseSchema.parse(EMPTY_SEARCH_RESPONSE)).toEqual(EMPTY_SEARCH_RESPONSE);
  });
});

describe('SearchQuerySchema', () => {
  it('coerces a string limit (query strings are always strings)', () => {
    expect(SearchQuerySchema.parse({ q: 'hi', limit: '5' })).toEqual({ q: 'hi', limit: 5 });
  });

  it('rejects a limit above the cap', () => {
    expect(SearchQuerySchema.safeParse({ q: 'hi', limit: MAX_SEARCH_LIMIT + 1 }).success).toBe(false);
  });

  it('allows an optional type filter and omitted limit', () => {
    const parsed = SearchQuerySchema.parse({ q: 'hi', type: 'project' });
    expect(parsed.type).toBe('project');
    expect(parsed.limit).toBeUndefined();
  });

  it('exposes a sensible default limit constant', () => {
    expect(DEFAULT_SEARCH_LIMIT).toBeLessThanOrEqual(MAX_SEARCH_LIMIT);
  });
});
