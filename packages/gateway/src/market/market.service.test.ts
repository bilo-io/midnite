import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketService } from './market.service';
import type { MarketCacheRepository } from './market-cache.repository';
import type { MarketCacheRow } from '../db/schema';

// In-memory stand-in for the DB-backed cache repository (CLAUDE.md: unit-test
// services with in-memory repository fakes). `store` is exposed for assertions.
function fakeRepo() {
  const store = new Map<string, MarketCacheRow>();
  const repo = {
    store,
    get: (key: string) => store.get(key),
    put: (key: string, payload: string, fetchedAt: string) => {
      store.set(key, { key, payload, fetchedAt });
    },
    prune: (beforeIso: string) => {
      for (const [k, v] of store) if (v.fetchedAt < beforeIso) store.delete(k);
    },
  };
  return repo as unknown as MarketCacheRepository & { store: Map<string, MarketCacheRow> };
}

const CG_COIN = {
  name: 'Bitcoin',
  market_data: {
    current_price: { usd: 60000 },
    high_24h: { usd: 61000 },
    low_24h: { usd: 59000 },
    price_change_24h: 1200,
    price_change_percentage_24h: 2.04,
  },
};
const CG_SEARCH = { coins: [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }] };
const CG_CHART = { prices: [[1000, 59000], [2000, 60000]] as [number, number][] };

const TD_QUOTE = {
  symbol: 'AAPL',
  name: 'Apple Inc',
  open: '189.0',
  high: '191.5',
  low: '188.2',
  close: '190.1',
  change: '1.1',
  percent_change: '0.58',
  currency: 'USD',
};
const TD_SEARCH = { data: [{ symbol: 'AAPL', instrument_name: 'Apple Inc', exchange: 'NASDAQ' }] };
const TD_SERIES = {
  values: [
    { datetime: '2026-01-02', close: '190.1' },
    { datetime: '2026-01-01', close: '188.0' },
  ],
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

// Route a mocked fetch by URL so one mock can serve every provider call.
function routedFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes('market_chart')) return json(CG_CHART);
    if (url.includes('/coins/')) return json(CG_COIN);
    if (url.includes('/search?query=')) return json(CG_SEARCH);
    if (url.includes('/symbol_search')) return json(TD_SEARCH);
    if (url.includes('/quote')) return json(TD_QUOTE);
    if (url.includes('/time_series')) return json(TD_SERIES);
    throw new Error(`unexpected url ${url}`);
  });
}

const ORIGINAL_KEY = process.env['TWELVE_DATA_API_KEY'];

beforeEach(() => {
  process.env['TWELVE_DATA_API_KEY'] = 'test-key';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  if (ORIGINAL_KEY === undefined) delete process.env['TWELVE_DATA_API_KEY'];
  else process.env['TWELVE_DATA_API_KEY'] = ORIGINAL_KEY;
});

describe('MarketService — crypto (CoinGecko)', () => {
  it('maps a coin into an OHLC quote (open derived from 24h change)', async () => {
    vi.stubGlobal('fetch', routedFetch());
    const quote = await new MarketService(fakeRepo()).quote('crypto', 'bitcoin');
    expect(quote).toMatchObject({
      kind: 'crypto',
      symbol: 'bitcoin',
      name: 'Bitcoin',
      price: 60000,
      open: 58800, // 60000 − 1200
      high: 61000,
      low: 59000,
      close: 60000,
      change: 1200,
      changePct: 2.04,
      currency: 'USD',
    });
  });

  it('returns the coin id as the symbol from search (round-trips into quote)', async () => {
    vi.stubGlobal('fetch', routedFetch());
    const results = await new MarketService(fakeRepo()).search('crypto', 'bit');
    expect(results[0]).toMatchObject({ kind: 'crypto', symbol: 'bitcoin' });
  });

  it('maps market_chart prices to oldest→newest points', async () => {
    vi.stubGlobal('fetch', routedFetch());
    const { points, timeframe } = await new MarketService(fakeRepo()).history('crypto', 'bitcoin', '7D');
    expect(timeframe).toBe('7D');
    expect(points).toEqual([{ t: 1000, c: 59000 }, { t: 2000, c: 60000 }]);
  });

  it('caches within the TTL', async () => {
    const fetchMock = routedFetch();
    vi.stubGlobal('fetch', fetchMock);
    const service = new MarketService(fakeRepo());
    await service.quote('crypto', 'bitcoin');
    await service.quote('crypto', 'bitcoin');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('MarketService — stocks (Twelve Data)', () => {
  it('maps a quote and reverses the time series to oldest→newest', async () => {
    vi.stubGlobal('fetch', routedFetch());
    const service = new MarketService(fakeRepo());
    const quote = await service.quote('stock', 'AAPL');
    expect(quote).toMatchObject({ kind: 'stock', symbol: 'AAPL', price: 190.1, changePct: 0.58, currency: 'USD' });

    const { points } = await service.history('stock', 'AAPL', '1M');
    expect(points.map((p) => p.c)).toEqual([188.0, 190.1]);
  });

  it('throws when stocks are unconfigured (no API key)', async () => {
    delete process.env['TWELVE_DATA_API_KEY'];
    const service = new MarketService(fakeRepo());
    await expect(service.quote('stock', 'AAPL')).rejects.toThrow(/TWELVE_DATA_API_KEY/);
  });

  it('surfaces Twelve Data error payloads (HTTP 200 + status:error)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ status: 'error', message: 'symbol not found' })),
    );
    const service = new MarketService(fakeRepo());
    await expect(service.quote('stock', 'NOPE')).rejects.toThrow('failed to load market');
  });
});

describe('MarketService — persistent 30-min cache', () => {
  it('persists across service instances (survives a gateway restart)', async () => {
    const fetchMock = routedFetch();
    vi.stubGlobal('fetch', fetchMock);
    const repo = fakeRepo();

    await new MarketService(repo).quote('crypto', 'bitcoin'); // fetch #1, stored
    expect(repo.store.has('quote:crypto:bitcoin')).toBe(true);

    // A brand-new instance (empty in-memory state) sharing the same store serves
    // the persisted copy without hitting upstream again.
    const restarted = await new MarketService(repo).quote('crypto', 'bitcoin');
    expect(restarted).toMatchObject({ symbol: 'bitcoin', price: 60000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches once the 30-min window lapses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T00:00:00Z'));
    const fetchMock = routedFetch();
    vi.stubGlobal('fetch', fetchMock);
    const service = new MarketService(fakeRepo());

    await service.quote('crypto', 'bitcoin'); // fetch #1
    vi.setSystemTime(new Date('2026-06-20T00:31:00Z')); // +31 min, past the 30-min gate
    await service.quote('crypto', 'bitcoin'); // fetch #2

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves the stored copy when a refetch fails (stale-on-error)', async () => {
    const repo = fakeRepo();
    const stored = { kind: 'crypto', symbol: 'bitcoin', name: 'Bitcoin', price: 42, at: 'old' };
    // Pre-seed an entry older than the 30-min gate so the next call attempts a refetch.
    repo.put('quote:crypto:bitcoin', JSON.stringify(stored), '2020-01-01T00:00:00.000Z');
    // ...but upstream is down — the stored copy should be served instead of throwing.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));

    const result = await new MarketService(repo).quote('crypto', 'bitcoin');
    expect(result).toMatchObject({ symbol: 'bitcoin', price: 42 });
  });
});
