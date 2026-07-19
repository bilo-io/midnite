import { describe, expect, it } from 'vitest';
import type { UsageBucket } from '@midnite/shared';
import { buildSpendSeries } from './usage-series';

function bucket(key: string, cost: number, input: number, output: number): UsageBucket {
  return { key, calls: 1, inputTokens: input, outputTokens: output, estCostUsd: cost };
}

describe('buildSpendSeries', () => {
  it('sorts by day key and normalises each series to 0–100 of its own max', () => {
    const series = buildSpendSeries([
      bucket('2026-07-03', 10, 100, 100), // cost max
      bucket('2026-07-01', 5, 50, 50),
      bucket('2026-07-02', 0, 400, 400), // token max
    ]);

    expect(series.labels).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
    // Cost: 5,0,10 → 50,0,100
    expect(series.cost).toEqual([50, 0, 100]);
    // Tokens (in+out): 100,800,200 → 13,100,25
    expect(series.tokens).toEqual([13, 100, 25]);
  });

  it('yields all-zero series when every value is zero (no divide-by-zero)', () => {
    const series = buildSpendSeries([bucket('2026-07-01', 0, 0, 0), bucket('2026-07-02', 0, 0, 0)]);
    expect(series.cost).toEqual([0, 0]);
    expect(series.tokens).toEqual([0, 0]);
  });

  it('handles an empty window', () => {
    const series = buildSpendSeries([]);
    expect(series).toEqual({ cost: [], tokens: [], labels: [] });
  });
});
