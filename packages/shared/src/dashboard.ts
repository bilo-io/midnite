import { z } from 'zod';

// ── Hacker News ──────────────────────────────────────────────
// The dashboard News widget is backed by a gateway proxy over the public Hacker
// News API. Only the fields the widget renders are kept.

export const NEWS_MIN_COUNT = 1;
export const NEWS_MAX_COUNT = 10;

export const HackerNewsStorySchema = z.object({
  id: z.number().int(),
  title: z.string(),
  /** Absent for "Ask HN"/text posts — the widget then links to the HN thread. */
  url: z.string().url().optional(),
  score: z.number().int().nonnegative(),
  by: z.string(),
  /** Comment count (HN calls it `descendants`). */
  comments: z.number().int().nonnegative(),
  /** Unix seconds the story was posted. */
  time: z.number().int().nonnegative(),
});

export const NewsResponseSchema = z.object({
  stories: z.array(HackerNewsStorySchema),
});

export const NewsQuerySchema = z.object({
  count: z.coerce.number().int().min(NEWS_MIN_COUNT).max(NEWS_MAX_COUNT).default(NEWS_MAX_COUNT),
});

export type HackerNewsStory = z.infer<typeof HackerNewsStorySchema>;
export type NewsResponse = z.infer<typeof NewsResponseSchema>;
export type NewsQuery = z.infer<typeof NewsQuerySchema>;

// ── Weather ──────────────────────────────────────────────────
// Backed by a gateway proxy over Open-Meteo (keyless). Temperatures are stored
// canonically in Celsius; the widget converts to Fahrenheit for display when the
// user picks imperial units. `weatherCode` is a WMO code the widget maps to an
// icon + label (clear / cloudy / rain / etc.).

export const WeatherResponseSchema = z.object({
  current: z.object({
    temperatureC: z.number(),
    weatherCode: z.number().int(),
    precipitation: z.number().nonnegative(),
  }),
  today: z.object({
    highC: z.number(),
    lowC: z.number(),
    /** Max chance of precipitation today, 0–100. */
    precipitationProbability: z.number().min(0).max(100),
    weatherCode: z.number().int(),
  }),
  /** ISO timestamp the upstream data was resolved (for cache transparency). */
  resolvedAt: z.string(),
});

export const WeatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export type WeatherResponse = z.infer<typeof WeatherResponseSchema>;
export type WeatherQuery = z.infer<typeof WeatherQuerySchema>;

// ── Link metadata ────────────────────────────────────────────
// Backed by a gateway proxy that fetches a URL's OpenGraph/title + favicon
// (browsers can't fetch arbitrary cross-origin HTML). Used by the dashboard
// quick-links widget to autofill a link's label and show its favicon.

export const LinkMetadataQuerySchema = z.object({
  url: z.string().url(),
});

export const LinkMetadataResponseSchema = z.object({
  title: z.string().optional(),
  faviconUrl: z.string().optional(),
});

export type LinkMetadataQuery = z.infer<typeof LinkMetadataQuerySchema>;
export type LinkMetadataResponse = z.infer<typeof LinkMetadataResponseSchema>;

// ── Market (stocks & crypto) ─────────────────────────────────
// Backed by a gateway proxy over Twelve Data (stocks, needs TWELVE_DATA_API_KEY)
// and CoinGecko (crypto, keyless). The browser never calls those APIs directly —
// the proxy hides the key, sidesteps CORS, and shares a TTL cache. For crypto the
// `symbol` is the CoinGecko coin id (e.g. `bitcoin`), not a ticker — it round-trips
// from search straight back into the quote/history calls.

export const AssetKindSchema = z.enum(['stock', 'crypto']);
export type AssetKind = z.infer<typeof AssetKindSchema>;

/** Global timeframe shared by every market card; ordered shortest → longest. */
export const MARKET_TIMEFRAMES = ['24H', '7D', '1M', '3M', '1Y'] as const;
export const MarketTimeframeSchema = z.enum(MARKET_TIMEFRAMES);
export type MarketTimeframe = z.infer<typeof MarketTimeframeSchema>;

/** Most assets a single watchlist card may track. */
export const MARKET_WATCHLIST_MAX = 5;

export const AssetSearchResultSchema = z.object({
  kind: AssetKindSchema,
  /** Ticker (stocks) or CoinGecko coin id (crypto). */
  symbol: z.string(),
  name: z.string(),
  /** Listing exchange, when the provider reports one (stocks only). */
  exchange: z.string().optional(),
});

export const AssetSearchResponseSchema = z.object({
  results: z.array(AssetSearchResultSchema),
});

export const MarketQuoteSchema = z.object({
  kind: AssetKindSchema,
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  /** Absolute change vs the previous close (24h ago for crypto). */
  change: z.number(),
  /** Percent change, e.g. -1.23 for −1.23%. */
  changePct: z.number(),
  currency: z.string(),
  /** ISO timestamp the upstream data was resolved (for cache transparency). */
  at: z.string(),
});

export const MarketHistoryPointSchema = z.object({
  /** Bucket timestamp, Unix milliseconds. */
  t: z.number(),
  /** Close price for the bucket. */
  c: z.number(),
});

export const MarketHistoryResponseSchema = z.object({
  kind: AssetKindSchema,
  symbol: z.string(),
  timeframe: MarketTimeframeSchema,
  /** Oldest → newest; ready to plot left-to-right as an area chart. */
  points: z.array(MarketHistoryPointSchema),
});

export const AssetSearchQuerySchema = z.object({
  kind: AssetKindSchema,
  query: z.string().min(1).max(64),
});

export const MarketQuoteQuerySchema = z.object({
  kind: AssetKindSchema,
  symbol: z.string().min(1).max(64),
});

export const MarketHistoryQuerySchema = z.object({
  kind: AssetKindSchema,
  symbol: z.string().min(1).max(64),
  timeframe: MarketTimeframeSchema,
});

export type AssetSearchResult = z.infer<typeof AssetSearchResultSchema>;
export type AssetSearchResponse = z.infer<typeof AssetSearchResponseSchema>;
export type MarketQuote = z.infer<typeof MarketQuoteSchema>;
export type MarketHistoryPoint = z.infer<typeof MarketHistoryPointSchema>;
export type MarketHistoryResponse = z.infer<typeof MarketHistoryResponseSchema>;
export type AssetSearchQuery = z.infer<typeof AssetSearchQuerySchema>;
export type MarketQuoteQuery = z.infer<typeof MarketQuoteQuerySchema>;
export type MarketHistoryQuery = z.infer<typeof MarketHistoryQuerySchema>;
