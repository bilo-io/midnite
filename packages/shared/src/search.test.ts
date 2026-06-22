import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEARCH_LIMIT,
  EMPTY_SEARCH_RESPONSE,
  MAX_SEARCH_LIMIT,
  SEARCH_TYPES,
  SearchQuerySchema,
  SearchResponseSchema,
  SearchResultSchema,
  emptySearchCounts,
} from './search.js';

const taskResult = {
  type: 'task' as const,
  id: 't1',
  title: 'Add <mark>auth</mark> flow',
  snippet: 'wire up the login endpoint',
  route: '/tasks/t1',
  score: 1.23,
};

describe('SearchResultSchema', () => {
  it('round-trips a result for each entity type', () => {
    for (const type of ['task', 'project', 'memory', 'note', 'council', 'workflow'] as const) {
      const result = { ...taskResult, type };
      expect(SearchResultSchema.parse(result)).toEqual(result);
    }
  });

  it('rejects an unknown entity type', () => {
    expect(SearchResultSchema.safeParse({ ...taskResult, type: 'comet' }).success).toBe(false);
  });

  it('rejects a result missing a required field', () => {
    const { route: _route, ...withoutRoute } = taskResult;
    expect(SearchResultSchema.safeParse(withoutRoute).success).toBe(false);
  });
});

describe('SearchResponseSchema', () => {
  it('round-trips a response with counts and total', () => {
    const response = {
      results: [taskResult],
      total: 1,
      byType: { ...emptySearchCounts(), task: 1 },
    };
    expect(SearchResponseSchema.parse(response)).toEqual(response);
  });
});

describe('SearchQuerySchema', () => {
  it('defaults limit and leaves type optional', () => {
    const parsed = SearchQuerySchema.parse({ q: 'auth' });
    expect(parsed).toEqual({ q: 'auth', limit: DEFAULT_SEARCH_LIMIT });
  });

  it('coerces a string limit from the query string', () => {
    expect(SearchQuerySchema.parse({ q: 'auth', limit: '5' }).limit).toBe(5);
  });

  it('trims q and rejects a blank query', () => {
    expect(SearchQuerySchema.parse({ q: '  auth  ' }).q).toBe('auth');
    expect(SearchQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
  });

  it('rejects a limit over the cap and an unknown type', () => {
    expect(SearchQuerySchema.safeParse({ q: 'a', limit: MAX_SEARCH_LIMIT + 1 }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ q: 'a', type: 'comet' }).success).toBe(false);
  });
});

describe('emptySearchCounts', () => {
  it('zeroes every entity type', () => {
    expect(emptySearchCounts()).toEqual({
      task: 0,
      project: 0,
      memory: 0,
      note: 0,
      council: 0,
      workflow: 0,
    });
  });
});

describe('SEARCH_TYPES + EMPTY_SEARCH_RESPONSE', () => {
  it('lists the six searchable types in display order', () => {
    expect(SEARCH_TYPES).toEqual(['task', 'project', 'memory', 'note', 'council', 'workflow']);
  });

  it('EMPTY_SEARCH_RESPONSE is a valid, zeroed response', () => {
    expect(SearchResponseSchema.parse(EMPTY_SEARCH_RESPONSE)).toEqual(EMPTY_SEARCH_RESPONSE);
    expect(EMPTY_SEARCH_RESPONSE.results).toEqual([]);
    expect(EMPTY_SEARCH_RESPONSE.total).toBe(0);
    expect(EMPTY_SEARCH_RESPONSE.byType).toEqual(emptySearchCounts());
  });
});
