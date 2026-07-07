import { describe, expect, it, vi } from 'vitest';
import { MetricsService } from './metrics.service';
import type { MetricsRepository } from './metrics.repository';

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
  } as unknown as MetricsRepository;
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
});
