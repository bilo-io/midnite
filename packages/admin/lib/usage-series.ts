import type { UsageBucket } from '@midnite/shared';

/**
 * Turn the usage summary's per-day buckets into the two 0–100 normalised series
 * the `@midnite/ui` `AreaChart` expects (it plots percentages). Cost and token
 * volume are each scaled to their own max so both curves fill the chart height.
 * Pure + unit-tested (`usage-series.test.ts`) — the only non-trivial aggregation
 * on the Usage page.
 */
export type SpendSeries = {
  /** Normalised (0–100) daily estimated cost. */
  cost: number[];
  /** Normalised (0–100) daily total token volume (input + output). */
  tokens: number[];
  /** The day keys, in order, for axis/labelling. */
  labels: string[];
};

function normalise(values: number[]): number[] {
  const max = values.reduce((m, v) => Math.max(m, v), 0);
  if (max <= 0) return values.map(() => 0);
  return values.map((v) => Math.round((v / max) * 100));
}

export function buildSpendSeries(byDay: readonly UsageBucket[]): SpendSeries {
  // Sort by day key so the trend reads left→right chronologically.
  const sorted = [...byDay].sort((a, b) => a.key.localeCompare(b.key));
  const cost = normalise(sorted.map((b) => b.estCostUsd));
  const tokens = normalise(sorted.map((b) => b.inputTokens + b.outputTokens));
  return { cost, tokens, labels: sorted.map((b) => b.key) };
}
