import { describe, expect, it, vi } from 'vitest';
import { MetricsService } from './metrics.service';
import type { MetricsRepository } from './metrics.repository';

function fakeRepo(): MetricsRepository {
  return {
    insertStart: vi.fn(),
    recordEnd: vi.fn(),
    countByDay: vi.fn(() => [{ day: '2026-06-23', count: 2 }]),
    durationBuckets: vi.fn(() => ({ under30s: 1, under2m: 1, under10m: 0, under30m: 0, over30m: 0 })),
    outcomeCounts: vi.fn(() => ({ done: 2, abandoned: 0, failed: 0, cancelled: 0 })),
  } as unknown as MetricsRepository;
}

function makeService(repo?: MetricsRepository): MetricsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper
  return new (MetricsService as any)(undefined, repo);
}

describe('MetricsService', () => {
  it('records queue depth in the gauge store', () => {
    const svc = makeService();
    svc.recordQueueDepth(5);
    const summary = svc.getOpsSummary();
    expect(summary.gauges.queueDepth).toBe(5);
  });

  it('records slot changes', () => {
    const svc = makeService();
    svc.recordSlotChange(2, 4);
    const summary = svc.getOpsSummary();
    expect(summary.gauges.slots?.used).toBe(2);
    expect(summary.gauges.slots?.total).toBe(4);
  });

  it('records tick latency', () => {
    const svc = makeService();
    svc.recordTickLatency(42);
    const { gauges } = svc.getOpsSummary();
    expect(gauges.lastTickLatencyMs).toBe(42);
  });

  it('composes repo aggregates into the ops summary', () => {
    const svc = makeService(fakeRepo());
    const summary = svc.getOpsSummary({ from: '2026-06-01', to: '2026-06-23' });
    expect(summary.throughput[0]?.count).toBe(2);
    expect(summary.outcomes.done).toBe(2);
    expect(summary.window.from).toBe('2026-06-01');
  });

  it('returns zeros for repo aggregates when no repo is injected', () => {
    const svc = makeService();
    const summary = svc.getOpsSummary();
    expect(summary.throughput).toHaveLength(0);
    expect(summary.outcomes.done).toBe(0);
  });

  it('recordRunStart returns a string id and calls repo.insertStart', () => {
    const repo = fakeRepo();
    const svc = makeService(repo);
    const id = svc.recordRunStart('task-1', 'my-repo');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(repo.insertStart).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-1', repo: 'my-repo' }));
  });

  it('recordRunEnd calls repo.recordEnd with the outcome', () => {
    const repo = fakeRepo();
    const svc = makeService(repo);
    const id = svc.recordRunStart('task-2', null);
    svc.recordRunEnd(id, 'done', 0);
    expect(repo.recordEnd).toHaveBeenCalledWith(id, 'done', 0, expect.any(String));
  });
});
