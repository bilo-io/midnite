import type { UsageAttributionResponse } from '@midnite/shared';

// Phase 61 I — pure render helpers for `midnite usage --by`. The command body in
// index.ts fetches `/usage/attribution` and paints these rows; keeping the shaping
// here makes it unit-testable without a gateway. The cost columns preserve Phase
// 61's honesty contract: a measured-vs-estimated split + an unpriced-sessions flag,
// never a single invented number.

/** Format a USD amount to 4 dp (agent-session costs are often sub-cent). */
export function formatUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

/** Compact integer with thousands separators. */
export function formatInt(n: number): string {
  return n.toLocaleString('en-US');
}

/** Short, human key for a bucket: its label when present, else the raw id (clipped). */
export function bucketLabel(key: string, label: string | null): string {
  if (label && label.trim()) return label;
  return key.length > 24 ? `${key.slice(0, 23)}…` : key;
}

export const USAGE_TABLE_HEAD = [
  'Key',
  'Sessions',
  'Input',
  'Output',
  'Cached',
  'Cost',
  'Measured',
  'Estimated',
  'Unpriced',
];

/**
 * Table rows for an attribution response — one per bucket (already cost-sorted by
 * the gateway) plus a bold-free `TOTAL` row. Numbers are formatted; colour is the
 * caller's concern.
 */
export function usageAttributionRows(res: UsageAttributionResponse): string[][] {
  const rows = res.buckets.map((b) => [
    bucketLabel(b.key, b.label),
    formatInt(b.sessions),
    formatInt(b.inputTokens),
    formatInt(b.outputTokens),
    formatInt(b.cachedTokens),
    formatUsd(b.estCostUsd),
    formatUsd(b.measuredCostUsd),
    formatUsd(b.estimatedCostUsd),
    b.unpricedSessions > 0 ? formatInt(b.unpricedSessions) : '—',
  ]);
  const t = res.totals;
  rows.push([
    'TOTAL',
    formatInt(t.sessions),
    formatInt(t.inputTokens),
    formatInt(t.outputTokens),
    formatInt(t.cachedTokens),
    formatUsd(t.estCostUsd),
    formatUsd(t.measuredCostUsd),
    formatUsd(t.estimatedCostUsd),
    t.unpricedSessions > 0 ? formatInt(t.unpricedSessions) : '—',
  ]);
  return rows;
}

/** One-line window summary for the header, e.g. "repo · 2026-07-01 → 2026-07-11". */
export function usageWindowLine(res: UsageAttributionResponse): string {
  const from = res.from ? res.from.slice(0, 10) : 'start';
  const to = res.to ? res.to.slice(0, 10) : 'now';
  return `${res.groupBy} · ${from} → ${to}`;
}
