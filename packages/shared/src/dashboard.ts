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
