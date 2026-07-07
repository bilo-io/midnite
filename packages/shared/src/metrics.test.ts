import { describe, expect, it } from 'vitest';

import {
  DurationBucketsSchema,
  GaugeHistoryResponseSchema,
  GaugeSampleSchema,
  MetricsGaugesSchema,
  OpsQuerySchema,
  OpsSummarySchema,
  OutcomeCountsSchema,
  RunCountByDaySchema,
} from './metrics.js';

describe('MetricsGaugesSchema', () => {
  it('parses a full live snapshot', () => {
    expect(
      MetricsGaugesSchema.parse({
        queueDepth: 3,
        slotsUsed: 2,
        slotsTotal: 8,
        lastTickLatencyMs: 14.5,
        updatedAt: '2026-06-01T10:00:00.000Z',
      }),
    ).toMatchObject({ queueDepth: 3, slotsUsed: 2, slotsTotal: 8 });
  });

  it('accepts null for all fields when the store has not been sampled', () => {
    expect(
      MetricsGaugesSchema.parse({
        queueDepth: null,
        slotsUsed: null,
        slotsTotal: null,
        lastTickLatencyMs: null,
        updatedAt: null,
      }).queueDepth,
    ).toBeNull();
  });
});

describe('OpsQuerySchema', () => {
  it('parses an empty query (both optional)', () => {
    expect(OpsQuerySchema.parse({})).toEqual({});
  });

  it('parses a window with from+to', () => {
    expect(OpsQuerySchema.parse({ from: 'a', to: 'b' })).toEqual({ from: 'a', to: 'b' });
  });
});

describe('OpsSummarySchema', () => {
  it('round-trips a full summary', () => {
    const summary = {
      gauges: {
        queueDepth: 1,
        slotsUsed: 1,
        slotsTotal: 4,
        lastTickLatencyMs: 10,
        updatedAt: 'x',
      },
      throughputByDay: [{ day: '2026-06-01', count: 5 }],
      durationBuckets: { lt1s: 1, lt5s: 2, lt30s: 0, lt2m: 0, gte2m: 0 },
      outcomeCounts: { done: 3, abandoned: 0, failed: 0, cancelled: 0 },
    };
    expect(OpsSummarySchema.parse(summary)).toMatchObject(summary);
  });
});

describe('sub-schemas', () => {
  it('RunCountByDaySchema validates correctly', () => {
    expect(RunCountByDaySchema.parse({ day: '2026-06-01', count: 5 })).toEqual({
      day: '2026-06-01',
      count: 5,
    });
  });

  it('DurationBucketsSchema requires all five buckets', () => {
    expect(() =>
      DurationBucketsSchema.parse({ lt1s: 1, lt5s: 0, lt30s: 0, lt2m: 0 }),
    ).toThrow();
  });

  it('OutcomeCountsSchema requires all four outcomes', () => {
    expect(() =>
      OutcomeCountsSchema.parse({ done: 1, abandoned: 0, failed: 0 }),
    ).toThrow();
  });

  describe('gauge history (Phase 61 D)', () => {
    it('GaugeSampleSchema accepts nullable gauge fields', () => {
      const s = GaugeSampleSchema.parse({
        at: '2026-07-07T00:00:00.000Z',
        queueDepth: 3,
        slotsUsed: null,
        slotsTotal: null,
        tickLatencyMs: null,
      });
      expect(s.queueDepth).toBe(3);
      expect(s.slotsUsed).toBeNull();
    });

    it('GaugeSampleSchema rejects a negative queue depth', () => {
      expect(() =>
        GaugeSampleSchema.parse({ at: 't', queueDepth: -1, slotsUsed: null, slotsTotal: null, tickLatencyMs: null }),
      ).toThrow();
    });

    it('GaugeHistoryResponseSchema round-trips samples + truncated', () => {
      const res = GaugeHistoryResponseSchema.parse({
        samples: [{ at: 't', queueDepth: 1, slotsUsed: 0, slotsTotal: 4, tickLatencyMs: 5 }],
        truncated: true,
      });
      expect(res.truncated).toBe(true);
      expect(res.samples).toHaveLength(1);
    });
  });
});
