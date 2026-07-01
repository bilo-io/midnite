import { z } from 'zod';

/**
 * Global full-text search contract (Phase 20).
 *
 * The gateway maintains a single FTS5 index across every searchable domain and
 * exposes a ranked `GET /search`. A result is self-contained — the denormalised
 * `title`/`snippet` mean the client renders a row and routes by `type`+`id`
 * without a per-hit re-fetch.
 */

/** The domains covered by global search. */
export const SEARCH_TYPES = [
  'task',
  'project',
  'memory',
  'note',
  'council',
  'workflow',
  'idea',
  'deck',
] as const;

export const SearchTypeSchema = z.enum(SEARCH_TYPES);
export type SearchType = z.infer<typeof SearchTypeSchema>;

/** Minimum trimmed query length we'll scan for — a single character is noise. */
export const MIN_SEARCH_QUERY_LENGTH = 2;
/** Default / maximum result counts the endpoint accepts. */
export const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_SEARCH_LIMIT = 100;

export const SearchResultSchema = z.object({
  type: SearchTypeSchema,
  /** The source entity id (routes back to the row via `type`+`id`). */
  id: z.string(),
  title: z.string(),
  /**
   * A short excerpt with the matched terms wrapped in `<mark>…</mark>`. The
   * surrounding text is raw entity content — clients MUST escape it before
   * rendering as HTML and treat only the `<mark>` tags as markup.
   */
  snippet: z.string(),
  /** Where the client should navigate to open the entity. */
  route: z.string(),
  /** Relevance score; higher is a better match (derived from FTS5 `bm25`). */
  score: z.number(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  /** Total matches across all types (not just the returned page). */
  total: z.number().int().nonnegative(),
  /** Match count per type, for grouped UIs. Only non-zero types are present. */
  byType: z.record(SearchTypeSchema, z.number().int().nonnegative()),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

/** Query params for `GET /search`. */
export const SearchQuerySchema = z.object({
  q: z.string(),
  type: SearchTypeSchema.optional(),
  limit: z.coerce.number().int().positive().max(MAX_SEARCH_LIMIT).optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/** Response from the admin reindex route. */
export const ReindexResponseSchema = z.object({
  indexed: z.number().int().nonnegative(),
});
export type ReindexResponse = z.infer<typeof ReindexResponseSchema>;

/** An empty response — short/blank queries resolve to this without scanning. */
export const EMPTY_SEARCH_RESPONSE: SearchResponse = { results: [], total: 0, byType: {} };
