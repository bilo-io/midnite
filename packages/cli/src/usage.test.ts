import { describe, expect, it } from 'vitest';
import type { UsageAttributionResponse } from '@midnite/shared';
import { bucketLabel, formatUsd, usageAttributionRows, usageWindowLine } from './usage.js';

const RES: UsageAttributionResponse = {
  from: '2026-07-01T00:00:00.000Z',
  to: '2026-07-11T00:00:00.000Z',
  groupBy: 'repo',
  totals: {
    sessions: 3,
    inputTokens: 3000,
    outputTokens: 1500,
    cachedTokens: 500,
    estCostUsd: 0.1234,
    measuredCostUsd: 0.1,
    estimatedCostUsd: 0.0234,
    unpricedSessions: 1,
  },
  buckets: [
    {
      key: 'acme/api',
      label: null,
      sessions: 2,
      inputTokens: 2000,
      outputTokens: 1000,
      cachedTokens: 400,
      estCostUsd: 0.1,
      measuredCostUsd: 0.09,
      estimatedCostUsd: 0.01,
      unpricedSessions: 0,
    },
    {
      key: 'proj-123',
      label: 'Widgets',
      sessions: 1,
      inputTokens: 1000,
      outputTokens: 500,
      cachedTokens: 100,
      estCostUsd: 0.0234,
      measuredCostUsd: 0.01,
      estimatedCostUsd: 0.0134,
      unpricedSessions: 1,
    },
  ],
};

describe('formatUsd', () => {
  it('renders 4 dp', () => {
    expect(formatUsd(0.1)).toBe('$0.1000');
    expect(formatUsd(1.23456)).toBe('$1.2346');
  });
});

describe('bucketLabel', () => {
  it('prefers the label, else the key (clipped)', () => {
    expect(bucketLabel('proj-1', 'Widgets')).toBe('Widgets');
    expect(bucketLabel('short', null)).toBe('short');
    expect(bucketLabel('x'.repeat(40), null)).toHaveLength(24);
  });
});

describe('usageAttributionRows', () => {
  it('renders one row per bucket + a TOTAL row with the cost split', () => {
    const rows = usageAttributionRows(RES);
    expect(rows).toHaveLength(3); // 2 buckets + TOTAL
    // first bucket: label falls back to key, cost split rendered, unpriced "—"
    expect(rows[0]).toEqual(['acme/api', '2', '2,000', '1,000', '400', '$0.1000', '$0.0900', '$0.0100', '—']);
    // second bucket shows the unpriced count
    expect(rows[1]![0]).toBe('Widgets');
    expect(rows[1]![8]).toBe('1');
    // totals row
    expect(rows[2]![0]).toBe('TOTAL');
    expect(rows[2]![5]).toBe('$0.1234');
    expect(rows[2]![8]).toBe('1');
  });
});

describe('usageWindowLine', () => {
  it('summarises groupBy + date range', () => {
    expect(usageWindowLine(RES)).toBe('repo · 2026-07-01 → 2026-07-11');
    expect(usageWindowLine({ ...RES, from: null, to: null })).toBe('repo · start → now');
  });
});
