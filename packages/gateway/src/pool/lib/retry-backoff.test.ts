import { describe, expect, it } from 'vitest';
import { computeBackoffMs } from './retry-backoff';

const opts = { retryBackoffBaseMs: 1000, maxBackoffMs: 30_000 };

describe('computeBackoffMs', () => {
  it('returns 0 when backoff is disabled (base = 0), regardless of retry index', () => {
    expect(computeBackoffMs(0, { retryBackoffBaseMs: 0, maxBackoffMs: 30_000 }, () => 1)).toBe(0);
    expect(computeBackoffMs(5, { retryBackoffBaseMs: 0, maxBackoffMs: 30_000 }, () => 1)).toBe(0);
  });

  it('grows the ceiling exponentially with the retry index (full-jitter max = base * 2^n)', () => {
    const max = () => 1; // rng at its ceiling exposes the exponential window
    expect(computeBackoffMs(0, opts, max)).toBe(1000); // 1000 * 2^0
    expect(computeBackoffMs(1, opts, max)).toBe(2000); // 1000 * 2^1
    expect(computeBackoffMs(2, opts, max)).toBe(4000); // 1000 * 2^2
    expect(computeBackoffMs(3, opts, max)).toBe(8000); // 1000 * 2^3
  });

  it('caps the ceiling at maxBackoffMs', () => {
    // 1000 * 2^10 = 1_024_000, clamped to the 30_000 cap.
    expect(computeBackoffMs(10, opts, () => 1)).toBe(30_000);
  });

  it('applies full jitter: the delay is a random fraction of the (capped) ceiling', () => {
    // rng=0 → no wait; rng=0.5 → half the ceiling; both stay within [0, ceiling).
    expect(computeBackoffMs(2, opts, () => 0)).toBe(0);
    expect(computeBackoffMs(2, opts, () => 0.5)).toBe(2000); // floor(0.5 * 4000)
  });

  it('never returns a negative index ceiling (guards a spurious negative retryIndex)', () => {
    expect(computeBackoffMs(-3, opts, () => 1)).toBe(1000); // 2^max(0,-3) = 2^0
  });
});
