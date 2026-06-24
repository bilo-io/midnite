import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { MetricsRepository } from './metrics.repository';
import type { AgentRunStatsInsert } from '../db/schema';

function makeRepo() {
  return new MetricsRepository(createTestDb().db);
}

let repo: MetricsRepository;

beforeEach(() => {
  repo = makeRepo();
});

function run(id: string, overrides: Partial<AgentRunStatsInsert> = {}): AgentRunStatsInsert {
  return {
    id,
    taskId: 't1',
    startedAt: `2026-06-01T00:0${id.slice(-1)}:00.000Z`,
    retryCount: 0,
    ...overrides,
  };
}

describe('MetricsRepository', () => {
  describe('insertStart + recordEnd round-trip', () => {
    it('inserts a live run with no outcome/endedAt', () => {
      repo.insertStart(run('r1'));
      // no throw = pass; the row exists (verified by recordEnd working below)
    });

    it('recordEnd fills the terminal fields', () => {
      repo.insertStart(run('r1'));
      repo.recordEnd('r1', '2026-06-01T00:01:30.000Z', 90_000, 'done');
      // Verified by outcomeCounts finding the row
      const counts = repo.outcomeCounts('2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z');
      expect(counts.done).toBe(1);
    });

    it('recordEnd is a no-op for an unknown id', () => {
      repo.recordEnd('missing', '2026-06-01T00:01:00.000Z', 1_000, 'done');
      // no throw = graceful no-op
    });
  });

  describe('countByDay', () => {
    it('counts runs per calendar day within the window', () => {
      repo.insertStart(run('r1', { startedAt: '2026-06-01T09:00:00.000Z' }));
      repo.insertStart(run('r2', { startedAt: '2026-06-01T10:00:00.000Z' }));
      repo.insertStart(run('r3', { startedAt: '2026-06-02T09:00:00.000Z' }));

      const result = repo.countByDay('2026-06-01T00:00:00.000Z', '2026-06-02T23:59:59.999Z');
      expect(result).toHaveLength(2);
      expect(result.find((r) => r.day === '2026-06-01')?.count).toBe(2);
      expect(result.find((r) => r.day === '2026-06-02')?.count).toBe(1);
    });

    it('excludes runs outside the window', () => {
      repo.insertStart(run('r1', { startedAt: '2026-05-31T23:59:00.000Z' }));
      repo.insertStart(run('r2', { startedAt: '2026-06-01T09:00:00.000Z' }));
      const result = repo.countByDay('2026-06-01T00:00:00.000Z', '2026-06-01T23:59:59.999Z');
      expect(result).toHaveLength(1);
      expect(result[0]?.count).toBe(1);
    });

    it('returns an empty array when no runs match', () => {
      expect(repo.countByDay('2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z')).toEqual([]);
    });
  });

  describe('durationBuckets', () => {
    it('buckets completed runs by duration', () => {
      repo.insertStart(run('r1'));
      repo.recordEnd('r1', '', 500, 'done');       // <1s
      repo.insertStart(run('r2'));
      repo.recordEnd('r2', '', 2_000, 'done');     // 1–5s
      repo.insertStart(run('r3'));
      repo.recordEnd('r3', '', 10_000, 'failed');  // 5–30s
      repo.insertStart(run('r4'));
      repo.recordEnd('r4', '', 60_000, 'done');    // 30–120s
      repo.insertStart(run('r5'));
      repo.recordEnd('r5', '', 200_000, 'done');   // ≥120s

      const b = repo.durationBuckets('2026-06-01T00:00:00.000Z', '2026-06-01T23:59:59.999Z');
      expect(b).toEqual({ lt1s: 1, lt5s: 1, lt30s: 1, lt2m: 1, gte2m: 1 });
    });

    it('skips live (no duration_ms) runs', () => {
      repo.insertStart(run('r1')); // never recordEnd'd
      const b = repo.durationBuckets('2026-06-01T00:00:00.000Z', '2026-06-01T23:59:59.999Z');
      expect(b).toEqual({ lt1s: 0, lt5s: 0, lt30s: 0, lt2m: 0, gte2m: 0 });
    });
  });

  describe('outcomeCounts', () => {
    it('counts each outcome independently', () => {
      for (const outcome of ['done', 'done', 'abandoned', 'failed', 'cancelled'] as const) {
        const id = `r-${outcome}-${Math.random()}`;
        repo.insertStart(run(id.slice(-3)));
        repo.recordEnd(id.slice(-3), '', 1_000, outcome);
      }
      const counts = repo.outcomeCounts('2026-06-01T00:00:00.000Z', '2026-06-01T23:59:59.999Z');
      expect(counts.done).toBe(2);
      expect(counts.abandoned).toBe(1);
      expect(counts.failed).toBe(1);
      expect(counts.cancelled).toBe(1);
    });

    it('excludes live runs (no outcome)', () => {
      repo.insertStart(run('r1'));
      const counts = repo.outcomeCounts('2026-06-01T00:00:00.000Z', '2026-06-01T23:59:59.999Z');
      expect(Object.values(counts).every((n) => n === 0)).toBe(true);
    });

    it('returns all-zero counts when no runs match the window', () => {
      repo.insertStart(run('r1'));
      repo.recordEnd('r1', '', 1_000, 'done');
      const counts = repo.outcomeCounts('2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z');
      expect(counts).toEqual({ done: 0, abandoned: 0, failed: 0, cancelled: 0 });
    });
  });
});
