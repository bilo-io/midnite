import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { SearchResponse, SearchResult } from '@midnite/shared';

// The page reads ?q= / ?type= from the URL; drive them via a mutable value.
let searchParamsValue = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsValue,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/search',
}));

const searchAll = vi.fn();
vi.mock('@/lib/api', () => ({ searchAll: (...args: unknown[]) => searchAll(...args) }));

import { SearchResults } from './search-results';

const result = (over: Partial<SearchResult>): SearchResult => ({
  type: 'task',
  id: 'id',
  title: 'A result',
  snippet: 'a <mark>match</mark> here',
  route: '/tasks',
  score: 1,
  ...over,
});

const response = (results: SearchResult[]): SearchResponse => {
  const byType: SearchResponse['byType'] = {};
  for (const r of results) byType[r.type] = (byType[r.type] ?? 0) + 1;
  return { results, total: results.length, byType };
};

describe('SearchResults', () => {
  beforeEach(() => {
    searchParamsValue = new URLSearchParams();
    searchAll.mockReset();
    searchAll.mockResolvedValue(response([]));
  });
  afterEach(() => vi.clearAllMocks());

  it('prompts when the query is empty', () => {
    render(<SearchResults />);
    expect(screen.getByText(/Search across tasks/i)).toBeTruthy();
    expect(searchAll).not.toHaveBeenCalled();
  });

  it('asks for more characters on a one-char query', () => {
    searchParamsValue = new URLSearchParams('q=a');
    render(<SearchResults />);
    expect(screen.getByText(/at least 2 characters/i)).toBeTruthy();
    expect(searchAll).not.toHaveBeenCalled();
  });

  it('renders grouped, highlighted results for a real query', async () => {
    searchParamsValue = new URLSearchParams('q=oauth');
    searchAll.mockResolvedValue(
      response([
        result({ type: 'task', id: 't1', title: 'Fix OAuth login' }),
        result({ type: 'note', id: 'n1', title: 'OAuth notes', route: '/dashboard' }),
      ]),
    );
    render(<SearchResults />);

    await waitFor(() => expect(screen.getByText('Fix OAuth login')).toBeTruthy());
    expect(screen.getByRole('heading', { name: /Tasks/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Notes/ })).toBeTruthy();
    expect(screen.getByText(/2 results for/i)).toBeTruthy();
    // The matched span is highlighted via a real <mark>, not raw HTML.
    expect(document.querySelector('mark')?.textContent).toBe('match');
    // Result links route to the entity.
    expect(screen.getByRole('link', { name: /Fix OAuth login/ }).getAttribute('href')).toBe('/tasks');
  });

  it('filters client-side by the ?type= pills without refetching', async () => {
    searchParamsValue = new URLSearchParams('q=oauth&type=note');
    searchAll.mockResolvedValue(
      response([
        result({ type: 'task', id: 't1', title: 'Fix OAuth login' }),
        result({ type: 'note', id: 'n1', title: 'OAuth notes', route: '/dashboard' }),
      ]),
    );
    render(<SearchResults />);

    await waitFor(() => expect(screen.getByText('OAuth notes')).toBeTruthy());
    expect(screen.queryByText('Fix OAuth login')).toBeNull(); // task filtered out
    expect(searchAll).toHaveBeenCalledTimes(1); // one fetch; pills filter locally
  });

  it('shows an empty state when nothing matches', async () => {
    searchParamsValue = new URLSearchParams('q=zzz');
    searchAll.mockResolvedValue(response([]));
    render(<SearchResults />);
    await waitFor(() => expect(screen.getByText(/No results for/i)).toBeTruthy());
  });
});
