import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type AssetKind,
  type AssetSearchResult,
  type MarketHistoryResponse,
  type MarketQuote,
  type MarketTimeframe,
} from '@midnite/shared';
import { MarketCacheRepository } from './market-cache.repository';
import { RateLimitedError, RateLimiter } from './lib/rate-limiter';

const TWELVE_DATA_BASE = 'https://api.twelvedata.com';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const FETCH_TIMEOUT_MS = 5000;

// One freshness gate for every endpoint: serve the stored copy until it's older
// than this, then refetch upstream once. Keeps free-tier credits (Twelve Data
// 800/day, CoinGecko keyless ~30/min) intact regardless of client poll cadence.
const MARKET_CACHE_TTL_MS = 30 * 60_000;
// Drop cache rows untouched for this long (mostly distinct autocomplete queries).
const MARKET_CACHE_PRUNE_MS = 7 * 24 * 60 * 60_000;

// How hard we may lean on CoinGecko. The keyless tier is far stingier than its
// docs suggest — measured against the live API, a fresh window answers ~6
// requests and then 429s everything for the rest of the minute. A dashboard
// timeframe switch fans out one request per market widget, so without pacing the
// second burst of the session is rejected wholesale (bilo-io/midnite-app#10).
//
// Spacing alone can't fix that (the ceiling is per-window, not per-second), so
// the retry budget is the real remedy: full-jitter backoff of up to 5s/10s/20s/40s
// carries a rejected call across the window boundary instead of failing it. With
// a demo key the ceiling is ~30/min, so the queue may run much tighter.
const CG_KEYLESS_SPACING_MS = 1200;
const CG_KEYED_SPACING_MS = 250;
const CG_MAX_RETRIES = 4;
const CG_BACKOFF_BASE_MS = 5000;

/** How each global timeframe maps onto provider request parameters. */
const TIMEFRAME_PARAMS: Record<
  MarketTimeframe,
  { coingeckoDays: number; tdInterval: string; tdOutputsize: number }
> = {
  '24H': { coingeckoDays: 1, tdInterval: '5min', tdOutputsize: 100 },
  '7D': { coingeckoDays: 7, tdInterval: '1h', tdOutputsize: 120 },
  '1M': { coingeckoDays: 30, tdInterval: '1day', tdOutputsize: 30 },
  '3M': { coingeckoDays: 90, tdInterval: '1day', tdOutputsize: 90 },
  '1Y': { coingeckoDays: 365, tdInterval: '1week', tdOutputsize: 52 },
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  // 429 is the one status worth retrying: the request was well-formed and the
  // same call will succeed once the provider's window rolls over.
  if (res.status === 429) throw new RateLimitedError(`${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

// ── Raw provider shapes (only the fields we read) ──
interface CgSearchResponse {
  coins?: { id: string; symbol?: string; name: string }[];
}
interface CgCoinResponse {
  name?: string;
  market_data?: {
    current_price?: { usd?: number };
    high_24h?: { usd?: number };
    low_24h?: { usd?: number };
    price_change_24h?: number;
    price_change_percentage_24h?: number;
  };
}
interface CgMarketChartResponse {
  prices?: [number, number][];
}
interface TdSearchResponse {
  data?: { symbol: string; instrument_name?: string; exchange?: string }[];
}
interface TdQuoteResponse {
  status?: string;
  message?: string;
  symbol?: string;
  name?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  change?: string;
  percent_change?: string;
  currency?: string;
}
interface TdTimeSeriesResponse {
  status?: string;
  message?: string;
  values?: { datetime: string; close: string }[];
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private readonly twelveKey = process.env['TWELVE_DATA_API_KEY']?.trim() || '';
  private readonly coingeckoKey = process.env['COINGECKO_DEMO_KEY']?.trim() || '';

  /**
   * Paces every CoinGecko call. Injectable so specs can drive the queue on a
   * virtual clock; production gets the tuned default for whichever tier the
   * configured key (or its absence) puts us on.
   */
  private readonly limiter: RateLimiter;

  constructor(
    @Inject(MarketCacheRepository) private readonly cacheRepo: MarketCacheRepository,
    limiter?: RateLimiter,
  ) {
    this.limiter =
      limiter ??
      new RateLimiter({
        minIntervalMs: this.coingeckoKey ? CG_KEYED_SPACING_MS : CG_KEYLESS_SPACING_MS,
        maxRetries: CG_MAX_RETRIES,
        backoffBaseMs: CG_BACKOFF_BASE_MS,
      });
  }

  /** Append the CoinGecko demo key when configured (lifts the keyless rate limit). */
  private cg(path: string): string {
    const sep = path.includes('?') ? '&' : '?';
    return this.coingeckoKey ? `${COINGECKO_BASE}${path}${sep}x_cg_demo_api_key=${this.coingeckoKey}` : `${COINGECKO_BASE}${path}`;
  }

  /**
   * Every CoinGecko read goes through here so the pacer sees the whole picture.
   * The queue key is the *path*, not the resolved URL, so it never carries the
   * demo key around — and so two callers wanting the same data coalesce.
   */
  private cgFetch<T>(path: string): Promise<T> {
    return this.limiter.run(path, () => fetchJson<T>(this.cg(path)));
  }

  private requireStockKey(): void {
    if (!this.twelveKey) {
      throw new Error('stocks unavailable: set TWELVE_DATA_API_KEY on the gateway');
    }
  }

  /**
   * Read-through cache backed by the gateway DB. Serves the stored payload while
   * it's younger than {@link MARKET_CACHE_TTL_MS}; otherwise refetches upstream
   * once, persists it, and prunes long-stale rows. On a fetch failure with any
   * stored copy present, serves that copy (stale-on-error) rather than failing.
   */
  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cacheRepo.get(key);
    const now = Date.now();
    if (hit && now - Date.parse(hit.fetchedAt) < MARKET_CACHE_TTL_MS) {
      return JSON.parse(hit.payload) as T;
    }
    try {
      const data = await load();
      this.cacheRepo.put(key, JSON.stringify(data), new Date(now).toISOString());
      this.cacheRepo.prune(new Date(now - MARKET_CACHE_PRUNE_MS).toISOString());
      return data;
    } catch (err) {
      if (hit) {
        this.logger.warn(`market ${key} fetch failed, serving stored copy: ${String(err)}`);
        return JSON.parse(hit.payload) as T;
      }
      throw new Error(`failed to load market ${key}`, { cause: err });
    }
  }

  async search(kind: AssetKind, query: string): Promise<AssetSearchResult[]> {
    if (kind === 'stock') this.requireStockKey();
    return this.cached(`search:${kind}:${query.toLowerCase()}`, () =>
      kind === 'crypto' ? this.searchCrypto(query) : this.searchStock(query),
    );
  }

  async quote(kind: AssetKind, symbol: string): Promise<MarketQuote> {
    if (kind === 'stock') this.requireStockKey();
    return this.cached(`quote:${kind}:${symbol}`, () =>
      kind === 'crypto' ? this.quoteCrypto(symbol) : this.quoteStock(symbol),
    );
  }

  async history(kind: AssetKind, symbol: string, timeframe: MarketTimeframe): Promise<MarketHistoryResponse> {
    if (kind === 'stock') this.requireStockKey();
    return this.cached(`history:${kind}:${symbol}:${timeframe}`, async () => {
      const points = kind === 'crypto' ? await this.historyCrypto(symbol, timeframe) : await this.historyStock(symbol, timeframe);
      return { kind, symbol, timeframe, points };
    });
  }

  // ── CoinGecko (crypto, keyless) ──
  private async searchCrypto(query: string): Promise<AssetSearchResult[]> {
    const raw = await this.cgFetch<CgSearchResponse>(`/search?query=${encodeURIComponent(query)}`);
    return (raw.coins ?? []).slice(0, 10).map((c) => ({
      kind: 'crypto' as const,
      symbol: c.id, // CoinGecko coin id round-trips into quote/history
      name: c.symbol ? `${c.name} (${c.symbol.toUpperCase()})` : c.name,
    }));
  }

  private async quoteCrypto(id: string): Promise<MarketQuote> {
    const raw = await this.cgFetch<CgCoinResponse>(
      `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
    );
    const md = raw.market_data ?? {};
    const price = num(md.current_price?.usd);
    const change = num(md.price_change_24h);
    return {
      kind: 'crypto',
      symbol: id,
      name: raw.name ?? id,
      price,
      open: price - change,
      high: num(md.high_24h?.usd),
      low: num(md.low_24h?.usd),
      close: price,
      change,
      changePct: num(md.price_change_percentage_24h),
      currency: 'USD',
      at: new Date().toISOString(),
    };
  }

  private async historyCrypto(id: string, timeframe: MarketTimeframe): Promise<{ t: number; c: number }[]> {
    const { coingeckoDays } = TIMEFRAME_PARAMS[timeframe];
    const raw = await this.cgFetch<CgMarketChartResponse>(
      `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${coingeckoDays}`,
    );
    return (raw.prices ?? []).map(([t, c]) => ({ t, c }));
  }

  // ── Twelve Data (stocks, keyed) ──
  private async searchStock(query: string): Promise<AssetSearchResult[]> {
    const raw = await fetchJson<TdSearchResponse>(
      `${TWELVE_DATA_BASE}/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=10&apikey=${this.twelveKey}`,
    );
    return (raw.data ?? []).slice(0, 10).map((d) => ({
      kind: 'stock' as const,
      symbol: d.symbol,
      name: d.instrument_name ?? d.symbol,
      exchange: d.exchange,
    }));
  }

  private async quoteStock(symbol: string): Promise<MarketQuote> {
    const raw = await fetchJson<TdQuoteResponse>(
      `${TWELVE_DATA_BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${this.twelveKey}`,
    );
    // Twelve Data signals errors with HTTP 200 + `status: 'error'`.
    if (raw.status === 'error') throw new Error(raw.message ?? 'quote unavailable');
    const close = num(raw.close);
    return {
      kind: 'stock',
      symbol: raw.symbol ?? symbol,
      name: raw.name ?? symbol,
      price: close,
      open: num(raw.open),
      high: num(raw.high),
      low: num(raw.low),
      close,
      change: num(raw.change),
      changePct: num(raw.percent_change),
      currency: raw.currency ?? 'USD',
      at: new Date().toISOString(),
    };
  }

  private async historyStock(symbol: string, timeframe: MarketTimeframe): Promise<{ t: number; c: number }[]> {
    const { tdInterval, tdOutputsize } = TIMEFRAME_PARAMS[timeframe];
    const raw = await fetchJson<TdTimeSeriesResponse>(
      `${TWELVE_DATA_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${tdInterval}&outputsize=${tdOutputsize}&apikey=${this.twelveKey}`,
    );
    if (raw.status === 'error') throw new Error(raw.message ?? 'history unavailable');
    // Twelve Data returns newest-first; reverse to oldest-first for plotting.
    return (raw.values ?? [])
      .map((v) => ({ t: Date.parse(v.datetime), c: num(v.close) }))
      .reverse();
  }
}
