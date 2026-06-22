import type { SearchResponse } from '@midnite/shared';
import { describe, expect, it } from 'vitest';
import { parseSearchType, plainSnippet, searchResultRows, searchSummaryLine } from './search.js';

const res: SearchResponse = {
  results: [
    { type: 'task', id: 't1', title: 'Fix login', snippet: 'the <mark>login</mark> flow', route: '/tasks', score: 2 },
    { type: 'note', id: 'n1', title: 'login notes', snippet: 'about <mark>login</mark>', route: '/dashboard', score: 1 },
  ],
  total: 5,
  byType: { task: 3, note: 2 },
};

describe('parseSearchType', () => {
  it('accepts a valid type', () => {
    expect(parseSearchType('project')).toBe('project');
  });
  it('rejects an unknown type', () => {
    expect(() => parseSearchType('widget')).toThrow(/invalid type/);
  });
});

describe('plainSnippet', () => {
  it('strips mark markers for the terminal', () => {
    expect(plainSnippet('a <mark>b</mark> c')).toBe('a b c');
  });
});

describe('searchResultRows', () => {
  it('renders type, id, title and a plain snippet', () => {
    expect(searchResultRows(res)).toEqual([
      ['task', 't1', 'Fix login', 'the login flow'],
      ['note', 'n1', 'login notes', 'about login'],
    ]);
  });
});

describe('searchSummaryLine', () => {
  it('summarises totals, the per-type breakdown and truncation', () => {
    expect(searchSummaryLine(res)).toBe('5 matches (3 task, 2 note) — showing 2');
  });
  it('reports an empty result set', () => {
    expect(searchSummaryLine({ results: [], total: 0, byType: {} })).toBe('no matches');
  });
  it('drops the truncation note when everything is shown', () => {
    const full: SearchResponse = { results: res.results, total: 2, byType: { task: 1, note: 1 } };
    expect(searchSummaryLine(full)).toBe('2 matches (1 task, 1 note)');
  });
});
