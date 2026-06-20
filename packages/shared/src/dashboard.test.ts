import { describe, expect, it } from 'vitest';
import {
  HackerNewsStorySchema,
  MarketHistoryQuerySchema,
  MarketQuoteSchema,
  NewsQuerySchema,
  WeatherQuerySchema,
} from './dashboard.js';

describe('HackerNewsStorySchema', () => {
  it('allows an absent url (Ask HN / text post)', () => {
    const story = { id: 1, title: 'Ask HN', score: 10, by: 'pg', comments: 3, time: 1 };
    expect(HackerNewsStorySchema.parse(story)).toEqual(story);
  });

  it('rejects a non-url url', () => {
    expect(
      HackerNewsStorySchema.safeParse({
        id: 1,
        title: 't',
        url: 'nope',
        score: 1,
        by: 'a',
        comments: 0,
        time: 1,
      }).success,
    ).toBe(false);
  });
});

describe('NewsQuerySchema', () => {
  it('coerces a string count and defaults to the max', () => {
    expect(NewsQuerySchema.parse({ count: '5' }).count).toBe(5);
    expect(NewsQuerySchema.parse({}).count).toBe(10);
  });

  it('rejects a count above the max', () => {
    expect(NewsQuerySchema.safeParse({ count: '11' }).success).toBe(false);
  });
});

describe('WeatherQuerySchema', () => {
  it('coerces lat/lon and rejects out-of-range latitude', () => {
    expect(WeatherQuerySchema.parse({ lat: '51.5', lon: '-0.1' })).toEqual({ lat: 51.5, lon: -0.1 });
    expect(WeatherQuerySchema.safeParse({ lat: '91', lon: '0' }).success).toBe(false);
  });
});

describe('MarketQuoteSchema / MarketHistoryQuerySchema', () => {
  it('rejects an unknown asset kind', () => {
    expect(
      MarketHistoryQuerySchema.safeParse({ kind: 'forex', symbol: 'X', timeframe: '24H' }).success,
    ).toBe(false);
  });

  it('rejects an unknown timeframe', () => {
    expect(
      MarketHistoryQuerySchema.safeParse({ kind: 'stock', symbol: 'AAPL', timeframe: '2Y' }).success,
    ).toBe(false);
  });

  it('round-trips a quote', () => {
    const quote = {
      kind: 'crypto' as const,
      symbol: 'bitcoin',
      name: 'Bitcoin',
      price: 1,
      open: 1,
      high: 2,
      low: 0.5,
      close: 1,
      change: 0,
      changePct: 0,
      currency: 'USD',
      at: '2026-06-20T00:00:00.000Z',
    };
    expect(MarketQuoteSchema.parse(quote)).toEqual(quote);
  });
});
