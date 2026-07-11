import { describe, expect, it, vi } from 'vitest';
import { MetricsService } from './metrics.service';
import type { DoneTaskCycleRow, MetricsRepository, RetryOverhead } from './metrics.repository';

function fakeRepo(): MetricsRepository {
  return {
    insertStart: vi.fn(),
    recordEnd: vi.fn(),
    countByDay: vi.fn(() => [{ day: '2026-06-23', count: 2 }]),
    durationBuckets: vi.fn(() => ({ lt1s: 0, lt5s: 1, lt30s: 1, lt2m: 0, gte2m: 0 })),
    outcomeCounts: vi.fn(() => ({ done: 2, abandoned: 0, failed: 0, cancelled: 0 })),
    insertGaugeSample: vi.fn(),
    gaugeHistory: vi.fn(() => ({ samples: [], truncated: false })),
    pruneGaugeSamplesBefore: vi.fn(() => 0),
    cycleRows: vi.fn((): DoneTaskCycleRow[] => []),
    retryOverheadByTask: vi.fn((): Map<string, RetryOverhead> => new Map()),
    runsForTask: vi.fn(() => []),
  } as unknown as MetricsRepository;
}

/** A completed task, one hour wait + two hours work by default. */
function cycleRow(id: string, overrides: Partial<DoneTaskCycleRow> = {}): DoneTaskCycleRow {
  return {
    id,
    repo: null,
    projectId: null,
    priority: 1,
    createdAt: '2026-06-10T00:00:00.000Z',
    firstWipAt: '2026-06-10T01:00:00.000Z',
    doneAt: '2026-06-10T03:00:00.000Z',
    ...overrides,
  };
}

function makeService(repo?: MetricsRepository): MetricsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper
  return new (MetricsService as any)(repo ?? fakeRepo());
}

describe('MetricsService', () => {
  it('records queue depth in the gauge store', () => {
    const svc = makeService();
    svc.recordQueueDepth(5);
    const summary = svc.getOpsSummary({});
    expect(summary.gauges.queueDepth).toBe(5);
  });

  it('records slot changes', () => {
    const svc = makeService();
    svc.recordSlotChange(2, 4);
    const summary = svc.getOpsSummary({});
    expect(summary.gauges.slotsUsed).toBe(2);
    expect(summary.gauges.slotsTotal).toBe(4);
  });

  it('records tick latency', () => {
    const svc = makeService();
    svc.recordTickLatency(42);
    const { gauges } = svc.getOpsSummary({});
    expect(gauges.lastTickLatencyMs).toBe(42);
  });

  it('composes repo aggregates into the ops summary', () => {
    const svc = makeService(fakeRepo());
    const summary = svc.getOpsSummary({ from: '2026-06-01', to: '2026-06-23' });
    expect(summary.throughputByDay[0]?.count).toBe(2);
    expect(summary.outcomeCounts.done).toBe(2);
  });

  it('returns empty throughput when no repo data', () => {
    const repo = {
      insertStart: vi.fn(),
      recordEnd: vi.fn(),
      countByDay: vi.fn(() => []),
      durationBuckets: vi.fn(() => ({ lt1s: 0, lt5s: 0, lt30s: 0, lt2m: 0, gte2m: 0 })),
      outcomeCounts: vi.fn(() => ({ done: 0, abandoned: 0, failed: 0, cancelled: 0 })),
    } as unknown as MetricsRepository;
    const svc = makeService(repo);
    const summary = svc.getOpsSummary({});
    expect(summary.throughputByDay).toHaveLength(0);
    expect(summary.outcomeCounts.done).toBe(0);
  });

  it('recordRunStart calls repo.insertStart with taskId', () => {
    const repo = fakeRepo();
    const svc = makeService(repo);
    svc.recordRunStart('run-1', 'task-1', 0, 'my-repo');
    expect(repo.insertStart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'run-1', taskId: 'task-1', repo: 'my-repo' }),
    );
  });

  it('recordRunEnd calls repo.recordEnd with outcome and duration', () => {
    const repo = fakeRepo();
    const svc = makeService(repo);
    svc.recordRunEnd('run-1', 'done', 1200);
    expect(repo.recordEnd).toHaveBeenCalledWith('run-1', expect.any(String), 1200, 'done');
  });

  // ── Gauge history (Phase 61 D) ───────────────────────────────────────────────

  it('sampleGauges skips (writes nothing) when no gauge is set yet', () => {
    const repo = fakeRepo();
    const svc = makeService(repo);
    expect(svc.sampleGauges()).toBe(false);
    expect(repo.insertGaugeSample).not.toHaveBeenCalled();
  });

  it('sampleGauges persists the current snapshot once a gauge is set', () => {
    const repo = fakeRepo();
    const svc = makeService(repo);
    svc.recordQueueDepth(3);
    svc.recordSlotChange(1, 4);
    expect(svc.sampleGauges('2026-07-07T00:00:00.000Z')).toBe(true);
    expect(repo.insertGaugeSample).toHaveBeenCalledWith(
      expect.objectContaining({ at: '2026-07-07T00:00:00.000Z', queueDepth: 3, slotsUsed: 1, slotsTotal: 4 }),
    );
  });

  it('pruneGaugeSamples is a no-op when retention is 0 (keep forever)', () => {
    const repo = fakeRepo();
    const svc = makeService(repo);
    expect(svc.pruneGaugeSamples(0)).toBe(0);
    expect(repo.pruneGaugeSamplesBefore).not.toHaveBeenCalled();
  });

  it('pruneGaugeSamples computes a cutoff from retentionDays', () => {
    const repo = fakeRepo();
    const svc = makeService(repo);
    const now = Date.parse('2026-07-07T00:00:00.000Z');
    svc.pruneGaugeSamples(30, now);
    expect(repo.pruneGaugeSamplesBefore).toHaveBeenCalledWith('2026-06-07T00:00:00.000Z');
  });

  it('getGaugeHistory maps repo rows to the response contract', () => {
    const repo = {
      ...fakeRepo(),
      gaugeHistory: vi.fn(() => ({
        samples: [{ at: 't', queueDepth: 1, slotsUsed: 0, slotsTotal: 4, tickLatencyMs: 5 }],
        truncated: true,
      })),
    } as unknown as MetricsRepository;
    const svc = makeService(repo);
    const res = svc.getGaugeHistory({});
    expect(res.truncated).toBe(true);
    expect(res.samples[0]).toEqual({ at: 't', queueDepth: 1, slotsUsed: 0, slotsTotal: 4, tickLatencyMs: 5 });
  });

  describe('getCycleTime (Phase 61 C)', () => {
    it('computes wait/work/end-to-end segments for the fleet (groupBy none)', () => {
      const repo = {
        ...fakeRepo(),
        cycleRows: vi.fn(() => [cycleRow('t1')]), // 1h wait, 2h work, 3h e2e
      } as unknown as MetricsRepository;
      const svc = makeService(repo);
      const res = svc.getCycleTime({ groupBy: 'none', windowDays: 30 });
      expect(res.groupBy).toBe('none');
      expect(res.groups).toHaveLength(1);
      const g = res.groups[0]!;
      expect(g.key).toBe('all');
      expect(g.taskCount).toBe(1);
      expect(g.wait).toEqual({ p50Ms: 3_600_000, p90Ms: 3_600_000, count: 1 });
      expect(g.work).toEqual({ p50Ms: 7_200_000, p90Ms: 7_200_000, count: 1 });
      expect(g.endToEnd.p50Ms).toBe(10_800_000);
    });

    it('splits into groups and sorts by taskCount desc', () => {
      const repo = {
        ...fakeRepo(),
        cycleRows: vi.fn(() => [
          cycleRow('a1', { repo: 'acme/api' }),
          cycleRow('a2', { repo: 'acme/api' }),
          cycleRow('w1', { repo: 'acme/web' }),
        ]),
      } as unknown as MetricsRepository;
      const svc = makeService(repo);
      const res = svc.getCycleTime({ groupBy: 'repo', windowDays: 30 });
      expect(res.groups.map((g) => [g.key, g.taskCount])).toEqual([
        ['acme/api', 2],
        ['acme/web', 1],
      ]);
    });

    it('buckets a null repo/project under (none)', () => {
      const repo = {
        ...fakeRepo(),
        cycleRows: vi.fn(() => [cycleRow('t1', { repo: null })]),
      } as unknown as MetricsRepository;
      const svc = makeService(repo);
      expect(svc.getCycleTime({ groupBy: 'repo', windowDays: 30 }).groups[0]!.key).toBe('(none)');
    });

    it('reports nulls for wait/work when a task never entered wip, but still an end-to-end', () => {
      const repo = {
        ...fakeRepo(),
        cycleRows: vi.fn(() => [cycleRow('t1', { firstWipAt: null })]),
      } as unknown as MetricsRepository;
      const svc = makeService(repo);
      const g = svc.getCycleTime({ groupBy: 'none', windowDays: 30 }).groups[0]!;
      expect(g.wait).toEqual({ p50Ms: null, p90Ms: null, count: 0 });
      expect(g.work).toEqual({ p50Ms: null, p90Ms: null, count: 0 });
      expect(g.endToEnd.count).toBe(1);
    });

    it('folds retry overhead in from agent_run_stats', () => {
      const repo = {
        ...fakeRepo(),
        cycleRows: vi.fn(() => [cycleRow('t1'), cycleRow('t2')]),
        retryOverheadByTask: vi.fn(
          () => new Map([['t1', { retryOverheadMs: 50_000, retryAttempts: 2 }]]),
        ),
      } as unknown as MetricsRepository;
      const svc = makeService(repo);
      const g = svc.getCycleTime({ groupBy: 'none', windowDays: 30 }).groups[0]!;
      expect(g.retryOverheadMsTotal).toBe(50_000);
      expect(g.tasksWithRetries).toBe(1);
    });

    it('memoizes per-terminal-task derivation across calls (repo hit, cache serves the math)', () => {
      const cycleRows = vi.fn(() => [cycleRow('t1')]);
      const repo = { ...fakeRepo(), cycleRows } as unknown as MetricsRepository;
      const svc = makeService(repo);
      const first = svc.getCycleTime({ groupBy: 'none', windowDays: 30 }).groups[0]!.endToEnd.p50Ms;
      const second = svc.getCycleTime({ groupBy: 'none', windowDays: 30 }).groups[0]!.endToEnd.p50Ms;
      expect(first).toBe(second);
      expect(cycleRows).toHaveBeenCalledTimes(2); // still queries; derivation is what's cached
    });

    it('returns no groups when the window is empty', () => {
      const svc = makeService();
      expect(svc.getCycleTime({ groupBy: 'none', windowDays: 30 }).groups).toEqual([]);
    });
  });

  describe('getRunTimeline (Phase 61 G)', () => {
    it('maps repository rows to the wire shape, preserving live-run nulls', () => {
      const runsForTask = vi.fn(() => [
        {
          id: 'r1',
          taskId: 't1',
          startedAt: '2026-06-01T00:00:00.000Z',
          endedAt: '2026-06-01T00:01:00.000Z',
          durationMs: 60_000,
          outcome: 'done',
          retryCount: 0,
          repo: 'web',
        },
        {
          id: 'r2',
          taskId: 't1',
          startedAt: '2026-06-01T00:02:00.000Z',
          endedAt: null,
          durationMs: null,
          outcome: null,
          retryCount: 1,
          repo: null,
        },
      ]);
      const repo = { ...fakeRepo(), runsForTask } as unknown as MetricsRepository;
      const svc = makeService(repo);

      const res = svc.getRunTimeline('t1');
      expect(runsForTask).toHaveBeenCalledWith('t1');
      expect(res.taskId).toBe('t1');
      expect(res.runs).toHaveLength(2);
      expect(res.runs[0]?.outcome).toBe('done');
      expect(res.runs[1]).toMatchObject({ endedAt: null, durationMs: null, outcome: null, retryCount: 1 });
    });

    it('returns an empty runs array for a task with no runs', () => {
      const svc = makeService();
      expect(svc.getRunTimeline('none')).toEqual({ taskId: 'none', runs: [] });
    });
  });
});
