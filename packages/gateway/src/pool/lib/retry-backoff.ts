/**
 * Phase 53 Theme B — pure retry-backoff math, kept out of the runner so it's
 * trivially unit-testable. The `retryIndex`th retry (0-indexed: the first retry
 * after the initial run is 0) waits a random `0..min(base * 2^retryIndex, cap)` ms
 * — AWS-style "full jitter", so a fleet of crash-looping tasks spreads out rather
 * than re-queuing in lockstep and hammering the pool.
 *
 * `retryBackoffBaseMs = 0` disables backoff and returns `0` — retries become
 * instant, exactly the pre-Phase-53 behaviour. `rng` is injectable so tests can
 * pin the jitter; it defaults to `Math.random`.
 */
export function computeBackoffMs(
  retryIndex: number,
  opts: { retryBackoffBaseMs: number; maxBackoffMs: number },
  rng: () => number = Math.random,
): number {
  const base = opts.retryBackoffBaseMs;
  if (base <= 0) return 0;
  const exp = base * 2 ** Math.max(0, retryIndex);
  const capped = Math.min(exp, opts.maxBackoffMs);
  return Math.floor(rng() * capped);
}
