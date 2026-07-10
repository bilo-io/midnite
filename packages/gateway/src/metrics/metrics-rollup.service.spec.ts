import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidniteConfig } from '@midnite/shared';

import { MetricsRollupService } from './metrics-rollup.service';
import type { MetricsRepository, RollupAggregateRow } from './metrics.repository';

function fakeRepo(agg: RollupAggregateRow[] = []) {
  return {
    aggregateForRollup: vi.fn(() => agg),
    upsertRollups: vi.fn(),
    pruneRawBefore: vi.fn(() => ({ llmUsage: 0, sessionUsage: 0, agentRunStats: 0, gaugeSamples: 0 })),
  } as unknown as MetricsRepository;
}

function cfg(rollupIntervalMs: number, rawRetentionDays: number): MidniteConfig {
  return { metrics: { rollupIntervalMs, rawRetentionDays, sampleIntervalMs: 0 } } as unknown as MidniteConfig;
}

const NOW = '2026-06-10T14:30:00.000Z';

describe('MetricsRollupService', () => {
  let repo: ReturnType<typeof fakeRepo>;
  beforeEach(() => {
    repo = fakeRepo([
      { period: 'hourly', bucketStart: '2026-06-10T13:00:00.000Z', source: 'runs', repo: 'web', provider: null, model: null, runCount: 1 },
    ]);
  });

  it('aggregates both periods, upserts, and prunes when retention > 0', () => {
    const svc = new MetricsRollupService(cfg(3_600_000, 30), repo);
    svc.tick(NOW);
    // hourly + daily
    expect(repo.aggregateForRollup).toHaveBeenCalledTimes(2);
    expect(repo.aggregateForRollup).toHaveBeenCalledWith('hourly', expect.any(String), '2026-06-10T14:00:00.000Z');
    expect(repo.aggregateForRollup).toHaveBeenCalledWith('daily', expect.any(String), '2026-06-10T00:00:00.000Z');
    expect(repo.upsertRollups).toHaveBeenCalledTimes(2);
    // upserted rows carry a deterministic key + createdAt
    const [rows] = (repo.upsertRollups as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(rows[0]).toMatchObject({ key: 'hourly|2026-06-10T13:00:00.000Z|runs|web||', createdAt: NOW });
    // prune cutoff = now - 30d
    expect(repo.pruneRawBefore).toHaveBeenCalledWith('2026-05-11T14:30:00.000Z');
  });

  it('does not prune when retention is 0 (keep forever)', () => {
    const svc = new MetricsRollupService(cfg(3_600_000, 0), repo);
    svc.tick(NOW);
    expect(repo.upsertRollups).toHaveBeenCalled();
    expect(repo.pruneRawBefore).not.toHaveBeenCalled();
  });

  it('is fail-open — a repo throw never escapes the tick', () => {
    const throwing = { aggregateForRollup: vi.fn(() => { throw new Error('db down'); }), upsertRollups: vi.fn(), pruneRawBefore: vi.fn() } as unknown as MetricsRepository;
    const svc = new MetricsRollupService(cfg(3_600_000, 30), throwing);
    expect(() => svc.tick(NOW)).not.toThrow();
    expect(throwing.pruneRawBefore).not.toHaveBeenCalled();
  });

  it('disabled (rollupIntervalMs = 0) → onModuleInit does nothing', () => {
    const svc = new MetricsRollupService(cfg(0, 30), repo);
    svc.onModuleInit();
    expect(repo.aggregateForRollup).not.toHaveBeenCalled();
  });
});
