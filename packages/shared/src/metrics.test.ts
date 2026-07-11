import { describe, expect, it } from 'vitest';

import {
  CYCLE_TIME_DEFAULT_WINDOW_DAYS,
  CycleTimeQuerySchema,
  CycleTimeResponseSchema,
  DurationBucketsSchema,
  GaugeHistoryResponseSchema,
  GaugeSampleSchema,
  MetricsGaugesSchema,
  MetricsRollupQuerySchema,
  MetricsRollupResponseSchema,
  MetricsRollupSchema,
  OpsQuerySchema,
  OpsSummarySchema,
  OutcomeCountsSchema,
  RunCountByDaySchema,
  RunTimelineEntrySchema,
  RunTimelineQuerySchema,
  RunTimelineResponseSchema,
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

  describe('cycle time (Phase 61 C)', () => {
    it('CycleTimeQuerySchema defaults groupBy=none and the window', () => {
      const q = CycleTimeQuerySchema.parse({});
      expect(q.groupBy).toBe('none');
      expect(q.windowDays).toBe(CYCLE_TIME_DEFAULT_WINDOW_DAYS);
    });

    it('CycleTimeQuerySchema coerces a string windowDays', () => {
      expect(CycleTimeQuerySchema.parse({ windowDays: '7' }).windowDays).toBe(7);
    });

    it('CycleTimeQuerySchema rejects a non-positive window and unknown groupBy', () => {
      expect(() => CycleTimeQuerySchema.parse({ windowDays: 0 })).toThrow();
      expect(() => CycleTimeQuerySchema.parse({ groupBy: 'bogus' })).toThrow();
    });

    it('CycleTimeResponseSchema round-trips a group with null segment stats', () => {
      const res = CycleTimeResponseSchema.parse({
        from: 'a',
        to: 'b',
        groupBy: 'repo',
        groups: [
          {
            key: 'acme/api',
            taskCount: 2,
            wait: { p50Ms: 1000, p90Ms: 2000, count: 2 },
            work: { p50Ms: null, p90Ms: null, count: 0 },
            endToEnd: { p50Ms: 3000, p90Ms: 4000, count: 2 },
            retryOverheadMsTotal: 50_000,
            tasksWithRetries: 1,
          },
        ],
      });
      expect(res.groups[0]?.work.p50Ms).toBeNull();
      expect(res.groups[0]?.retryOverheadMsTotal).toBe(50_000);
    });
  });

  describe('MetricsRollup (Phase 61 E)', () => {
    const row = {
      key: 'daily|2026-06-01T00:00:00.000Z|runs|web||',
      period: 'daily' as const,
      bucketStart: '2026-06-01T00:00:00.000Z',
      source: 'runs' as const,
      repo: 'web',
      provider: null,
      model: null,
      runCount: 3,
      doneCount: 2,
      abandonedCount: 1,
      failedCount: 0,
      cancelledCount: 0,
      totalDurationMs: 90000,
      retriedRuns: 1,
      calls: null,
      inputTokens: null,
      outputTokens: null,
      estCostUsd: null,
      avgQueueDepth: null,
      avgSlotsUsed: null,
      avgTickLatencyMs: null,
      sampleCount: null,
    };

    it('round-trips a rollup row', () => {
      expect(MetricsRollupSchema.parse(row)).toEqual(row);
    });

    it('query defaults period to daily', () => {
      expect(MetricsRollupQuerySchema.parse({})).toMatchObject({ period: 'daily' });
    });

    it('rejects an unknown source + period', () => {
      expect(MetricsRollupQuerySchema.safeParse({ period: 'weekly' }).success).toBe(false);
      expect(MetricsRollupSchema.safeParse({ ...row, source: 'bogus' }).success).toBe(false);
    });

    it('round-trips a response envelope', () => {
      const res = MetricsRollupResponseSchema.parse({ period: 'daily', from: 'a', to: 'b', rows: [row] });
      expect(res.rows).toHaveLength(1);
    });
  });

  describe('run timeline (Phase 61 G)', () => {
    const completed = {
      id: 'r1',
      taskId: 't1',
      startedAt: '2026-06-01T00:00:00.000Z',
      endedAt: '2026-06-01T00:01:30.000Z',
      durationMs: 90_000,
      outcome: 'done' as const,
      retryCount: 0,
      repo: 'web',
    };
    const live = {
      id: 'r2',
      taskId: 't1',
      startedAt: '2026-06-01T00:02:00.000Z',
      endedAt: null,
      durationMs: null,
      outcome: null,
      retryCount: 1,
      repo: null,
    };

    it('round-trips a completed and a live run', () => {
      expect(RunTimelineEntrySchema.parse(completed)).toEqual(completed);
      expect(RunTimelineEntrySchema.parse(live)).toEqual(live);
    });

    it('rejects an unknown outcome', () => {
      expect(RunTimelineEntrySchema.safeParse({ ...completed, outcome: 'bogus' }).success).toBe(false);
    });

    it('RunTimelineQuerySchema requires a non-empty taskId', () => {
      expect(RunTimelineQuerySchema.parse({ taskId: 't1' })).toEqual({ taskId: 't1' });
      expect(RunTimelineQuerySchema.safeParse({}).success).toBe(false);
      expect(RunTimelineQuerySchema.safeParse({ taskId: '' }).success).toBe(false);
    });

    it('RunTimelineResponseSchema round-trips a task with runs', () => {
      const res = RunTimelineResponseSchema.parse({ taskId: 't1', runs: [completed, live] });
      expect(res.runs).toHaveLength(2);
      expect(res.runs[1]?.endedAt).toBeNull();
    });
  });
});
