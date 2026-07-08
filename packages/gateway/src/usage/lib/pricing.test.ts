import { describe, expect, it } from 'vitest';
import { estimateCostUsd, estimateSessionCostUsd, hasKnownPrice, priceForModel } from './pricing';

describe('pricing', () => {
  it('matches Anthropic aliases and concrete ids', () => {
    expect(priceForModel('claude-opus-4-8').inputPerM).toBe(15);
    expect(priceForModel('opus4.8').inputPerM).toBe(15);
    expect(priceForModel('claude-haiku-4-5-20251001').outputPerM).toBe(5);
    expect(priceForModel('claude-sonnet-4-6').inputPerM).toBe(3);
  });

  it('matches OpenAI mini variants before the base family', () => {
    expect(priceForModel('gpt-5.4-mini').inputPerM).toBe(0.25);
    expect(priceForModel('gpt-5').inputPerM).toBe(1.25);
    expect(priceForModel('o4-mini').outputPerM).toBe(4.4);
  });

  it('matches Gemini flash before pro', () => {
    expect(priceForModel('gemini-2.5-flash').inputPerM).toBe(0.3);
    expect(priceForModel('gemini-2.5-pro').inputPerM).toBe(1.25);
  });

  it('falls back to zero for an unknown model', () => {
    expect(priceForModel('totally-made-up')).toEqual({ inputPerM: 0, outputPerM: 0 });
    expect(hasKnownPrice('totally-made-up')).toBe(false);
    expect(hasKnownPrice('claude-opus-4-8')).toBe(true);
  });

  it('estimates cost from token counts (per-million pricing)', () => {
    // opus: $15/M in, $75/M out. 1M in + 1M out → $90.
    expect(estimateCostUsd('claude-opus-4-8', 1_000_000, 1_000_000)).toBeCloseTo(90, 6);
    // haiku: $1/M in, $5/M out. 500k in + 200k out → 0.5 + 1.0 = $1.50.
    expect(estimateCostUsd('haiku4.5', 500_000, 200_000)).toBeCloseTo(1.5, 6);
  });

  it('returns 0 cost for an unknown model but still computes', () => {
    expect(estimateCostUsd('mystery-model', 9999, 9999)).toBe(0);
  });
});

describe('estimateSessionCostUsd (Phase 61 A — cache-aware)', () => {
  it('prices input, output, cache-read (0.1×) and cache-write (1.25×) of input', () => {
    // sonnet: $3/M in, $15/M out. 1M in + 1M out + 1M cache-read + 1M cache-write:
    //   3 + 15 + (3 × 0.1) + (3 × 1.25) = 3 + 15 + 0.3 + 3.75 = $22.05
    const cost = estimateSessionCostUsd('claude-sonnet-4-6', {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cachedReadTokens: 1_000_000,
      cachedWriteTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(22.05, 6);
  });

  it('returns null (not 0) for an unpriced model — honesty contract', () => {
    expect(
      estimateSessionCostUsd('mystery-model', {
        inputTokens: 100,
        outputTokens: 100,
        cachedReadTokens: 0,
        cachedWriteTokens: 0,
      }),
    ).toBeNull();
  });
});
