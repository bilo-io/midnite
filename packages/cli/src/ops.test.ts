import { describe, expect, it } from 'vitest';
import type { OpsSummary } from '@midnite/shared';
import { opsDurationRows, opsGaugeRows, opsOutcomeRows, opsThroughputRows } from './ops.js';

const SUMMARY: OpsSummary = {
  gauges: {
    queueDepth: 3,
    slotsUsed: 2,
    slotsTotal: 4,
    lastTickLatencyMs: 12.7,
    updatedAt: '2026-07-11T12:00:00.000Z',
  },
  throughputByDay: Array.from({ length: 9 }, (_, i) => ({ day: `2026-07-0${i + 1}`, count: i })),
  durationBuckets: { lt1s: 1, lt5s: 2, lt30s: 3, lt2m: 4, gte2m: 5 },
  outcomeCounts: { done: 10, abandoned: 1, failed: 2, cancelled: 0 },
};

describe('opsGaugeRows', () => {
  it('renders gauge values + slots as used/total', () => {
    const rows = opsGaugeRows(SUMMARY);
    expect(rows[0]).toEqual(['Queue depth', '3']);
    expect(rows[1]).toEqual(['Slots in use', '2 / 4']);
    expect(rows[2]).toEqual(['Last tick latency', '13 ms']);
  });

  it('renders — for unset gauges', () => {
    const rows = opsGaugeRows({
      ...SUMMARY,
      gauges: { queueDepth: null, slotsUsed: null, slotsTotal: null, lastTickLatencyMs: null, updatedAt: null },
    });
    expect(rows[0]).toEqual(['Queue depth', '—']);
    expect(rows[1]).toEqual(['Slots in use', '—']);
    expect(rows[3]).toEqual(['Gauges updated', '—']);
  });
});

describe('opsOutcomeRows', () => {
  it('lists each outcome + a total', () => {
    const rows = opsOutcomeRows(SUMMARY);
    expect(rows[0]).toEqual(['Done', '10']);
    expect(rows[4]).toEqual(['Total', '13']);
  });
});

describe('opsDurationRows', () => {
  it('renders the five buckets', () => {
    expect(opsDurationRows(SUMMARY)).toEqual([
      ['< 1s', '1'],
      ['< 5s', '2'],
      ['< 30s', '3'],
      ['< 2m', '4'],
      ['≥ 2m', '5'],
    ]);
  });
});

describe('opsThroughputRows', () => {
  it('keeps only the last N days (most recent last)', () => {
    const rows = opsThroughputRows(SUMMARY, 7);
    expect(rows).toHaveLength(7);
    expect(rows[0]![0]).toBe('2026-07-03');
    expect(rows[6]![0]).toBe('2026-07-09');
  });
});
