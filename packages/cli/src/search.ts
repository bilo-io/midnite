import { SearchTypeSchema, type SearchResponse, type SearchType } from '@midnite/shared';

/** Validate a `--type` flag against the searchable domains. */
export function parseSearchType(raw: string): SearchType {
  const parsed = SearchTypeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `invalid type "${raw}" — expected one of: ${SearchTypeSchema.options.join(', ')}`,
    );
  }
  return parsed.data;
}

/** Strip the `<mark>` highlight markers (meant for web rendering) for the terminal. */
export function plainSnippet(snippet: string): string {
  return snippet.replace(/<\/?mark>/g, '');
}

/** Table rows for `midnite search` output. */
export function searchResultRows(res: SearchResponse): string[][] {
  return res.results.map((r) => [r.type, r.id, r.title, plainSnippet(r.snippet)]);
}

/** One-line summary: total matches, the per-type breakdown, and any truncation. */
export function searchSummaryLine(res: SearchResponse): string {
  if (res.total === 0) return 'no matches';
  const breakdown = Object.entries(res.byType)
    .map(([type, n]) => `${n} ${type}`)
    .join(', ');
  const truncated = res.results.length < res.total ? ` — showing ${res.results.length}` : '';
  return `${res.total} match${res.total === 1 ? '' : 'es'} (${breakdown})${truncated}`;
}
