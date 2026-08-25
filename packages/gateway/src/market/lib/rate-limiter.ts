/**
 * A tiny outbound request pacer for the market providers.
 *
 * The dashboard fans one user action out into many upstream calls: switching the
 * global timeframe invalidates the asset widget *and* every watchlist row at
 * once, so five-plus `market_chart` requests leave the gateway in the same tick.
 * Keyless CoinGecko answers a first burst and then 429s everything that follows
 * inside the same minute — which is why only the default timeframe (fetched on
 * the very first, unspent burst, then held by the 30-min cache) ever rendered.
 *
 * Three behaviours, all needed together:
 *
 *  - **single-flight** — concurrent callers asking for the same key share one
 *    execution. Two widgets showing the same symbol cost one upstream call.
 *  - **spacing** — executions are serialised with at least `minIntervalMs`
 *    between starts, so a burst becomes a queue instead of a thundering herd.
 *  - **retry** — a call rejected as rate-limited is retried with exponential
 *    backoff + full jitter, so the pacing only has to be *roughly* right.
 *
 * Deliberately not a token bucket: the 30-min read-through cache already caps
 * sustained volume, so all this has to do is flatten bursts.
 */

/** Thrown by a task to signal "upstream refused me, this is worth retrying". */
export class RateLimitedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitedError';
  }
}

export interface RateLimiterOptions {
  /** Minimum gap between the *starts* of two executions. */
  minIntervalMs: number;
  /** How many times a {@link RateLimitedError} is retried before giving up. */
  maxRetries: number;
  /** Backoff base; the Nth retry waits a random 0..`base * 2^N` ms (full jitter). */
  backoffBaseMs: number;
  /** Injected so specs can run the queue without real time passing. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Injected so the backoff is deterministic under test. */
  random?: () => number;
}

const defaultSleep = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private readonly opts: Required<RateLimiterOptions>;
  /** Tail of the serial queue — every task chains onto this. */
  private queue: Promise<unknown> = Promise.resolve();
  /** When the last execution started, so the next one can space itself off it. */
  private lastStart = Number.NEGATIVE_INFINITY;
  /** In-flight executions by key, for single-flight coalescing. */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(options: RateLimiterOptions) {
    this.opts = {
      sleep: defaultSleep,
      now: () => Date.now(),
      random: Math.random,
      ...options,
    };
  }

  /**
   * Run `task`, paced and retried. Callers sharing a `key` while one is already
   * in flight get that same promise rather than a second execution.
   */
  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;

    // Chain onto the queue tail so executions never overlap, and swallow the
    // predecessor's rejection — one failed task must not poison the queue.
    const started = this.queue.then(
      () => this.execute(task),
      () => this.execute(task),
    );
    this.queue = started.catch(() => undefined);

    const tracked = started.finally(() => {
      // Only clear our own entry: a later caller may have installed a new one.
      if (this.inFlight.get(key) === tracked) this.inFlight.delete(key);
    });
    this.inFlight.set(key, tracked);
    return tracked;
  }

  private async execute<T>(task: () => Promise<T>): Promise<T> {
    const { minIntervalMs, maxRetries, backoffBaseMs, sleep, now, random } = this.opts;

    for (let attempt = 0; ; attempt++) {
      const since = now() - this.lastStart;
      if (since < minIntervalMs) await sleep(minIntervalMs - since);
      this.lastStart = now();

      try {
        return await task();
      } catch (err) {
        if (!(err instanceof RateLimitedError) || attempt >= maxRetries) throw err;
        // Full jitter: spreads a burst of retries instead of re-synchronising it.
        await sleep(Math.floor(random() * backoffBaseMs * 2 ** attempt));
      }
    }
  }
}
