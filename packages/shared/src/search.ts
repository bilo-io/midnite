import { z } from 'zod';

// The domain entities the unified global index covers (Phase 20 Decision §5).
// Order is the display order the palette/results page group by (tasks first).
export const SEARCH_TYPES = [
  'task',
  'project',
  'memory',
  'note',
  'council',
  'workflow',
] as const;
export const SearchTypeSchema = z.enum(SEARCH_TYPES);
export type SearchType = z.infer<typeof SearchTypeSchema>;

/** Shortest query we run a full-text scan for — a single char is too noisy. */
export const MIN_SEARCH_QUERY_LENGTH = 2;
/** Default page size and hard cap for a single search. */
export const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_SEARCH_LIMIT = 100;

// The fields every result row carries, regardless of entity type. The index
// stores denormalised `title`/`snippet` so a result renders without a per-hit
// re-fetch (Decision §6); the client routes by `type` + `id` via `route`.
// `title`/`snippet` may contain `<mark>…</mark>` emphasis from the FTS highlighter
// — clients must escape the surrounding text before rendering it as HTML.
const searchResultFields = {
  id: z.string(),
  title: z.string(),
  snippet: z.string(),
  route: z.string(),
  score: z.number(),
};

// A discriminated union on `type` (Phase 20 scope guardrails): the shape is
// uniform today, but the discriminant lets a variant carry entity-specific fields
// later without widening every other branch.
export const SearchResultSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('task'), ...searchResultFields }),
  z.object({ type: z.literal('project'), ...searchResultFields }),
  z.object({ type: z.literal('memory'), ...searchResultFields }),
  z.object({ type: z.literal('note'), ...searchResultFields }),
  z.object({ type: z.literal('council'), ...searchResultFields }),
  z.object({ type: z.literal('workflow'), ...searchResultFields }),
]);
export type SearchResult = z.infer<typeof SearchResultSchema>;

// Counts per entity type for the matched set (every type present, 0 when none) —
// drives the palette's "group by type" headers and the results-page filter pills.
export const SearchCountsByTypeSchema = z.object({
  task: z.number().int().nonnegative(),
  project: z.number().int().nonnegative(),
  memory: z.number().int().nonnegative(),
  note: z.number().int().nonnegative(),
  council: z.number().int().nonnegative(),
  workflow: z.number().int().nonnegative(),
});
export type SearchCountsByType = z.infer<typeof SearchCountsByTypeSchema>;

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number().int().nonnegative(),
  byType: SearchCountsByTypeSchema,
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// The `GET /search` query shape. `limit` arrives as a string on the wire, so it
// is coerced; `q` is trimmed and length-bounded.
export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: SearchTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).default(DEFAULT_SEARCH_LIMIT),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/** A zeroed `byType` map — the base every count tally starts from. */
export function emptySearchCounts(): SearchCountsByType {
  return { task: 0, project: 0, memory: 0, note: 0, council: 0, workflow: 0 };
}

/**
 * The empty response — no hits, zero counts. Clients use it as the initial /
 * reset state (e.g. the command palette before a query, or after clearing), and
 * the gateway returns it for a too-short query without touching the index.
 */
export const EMPTY_SEARCH_RESPONSE: SearchResponse = {
  results: [],
  total: 0,
  byType: emptySearchCounts(),
};
