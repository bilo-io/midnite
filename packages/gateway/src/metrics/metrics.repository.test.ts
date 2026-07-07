import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { MetricsRepository } from './metrics.repository';
import { tasks, taskEvents, type AgentRunStatsInsert } from '../db/schema';

type TestDb = ReturnType<typeof createTestDb>['db'];

let repo: MetricsRepository;
let db: TestDb;

beforeEach(() => {
  db = createTestDb().db;
  repo = new MetricsRepository(db);
});

// ── Cycle-time fixtures ─────────────────────────────────────────────────────
function seedTask(
  id: string,
  overrides: Partial<{ status: string; repo: string | null; projectId: string | null; priority: number; createdAt: string }> = {},
): void {
  const now = overrides.createdAt ?? '2026-06-01T00:00:00.000Z';
  db.insert(tasks)
    .values({
      id,
      title: id,
      status: overrides.status ?? 'done',
      priority: overrides.priority ?? 1,
      repo: overrides.repo ?? null,
      projectId: overrides.projectId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

let evtSeq = 0;
function seedStatusEvent(taskId: string, status: string, at: string): void {
  db.insert(taskEvents)
    .values({ id: `e${evtSeq++}`, taskId, at, kind: 'status.changed', data: JSON.stringify({ status }) })
    .run();
}

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

  describe('gauge samples (Phase 61 D)', () => {
    const sample = (id: string, at: string, queueDepth = 1) => ({
      id,
      at,
      queueDepth,
      slotsUsed: 0,
      slotsTotal: 4,
      tickLatencyMs: 5,
    });

    it('returns samples in the window oldest-first', () => {
      repo.insertGaugeSample(sample('s2', '2026-07-07T00:02:00.000Z', 2));
      repo.insertGaugeSample(sample('s1', '2026-07-07T00:01:00.000Z', 1));
      repo.insertGaugeSample(sample('s3', '2026-07-07T00:03:00.000Z', 3));
      const { samples, truncated } = repo.gaugeHistory(undefined, undefined, 100);
      expect(truncated).toBe(false);
      expect(samples.map((s) => s.queueDepth)).toEqual([1, 2, 3]); // oldest → newest
    });

    it('honors the [from,to] window', () => {
      repo.insertGaugeSample(sample('s1', '2026-07-07T00:01:00.000Z'));
      repo.insertGaugeSample(sample('s2', '2026-07-07T00:05:00.000Z'));
      const { samples } = repo.gaugeHistory('2026-07-07T00:03:00.000Z', undefined, 100);
      expect(samples.map((s) => s.id)).toEqual(['s2']);
    });

    it('caps at the limit keeping the newest, and flags truncated', () => {
      for (let i = 0; i < 5; i++) {
        repo.insertGaugeSample(sample(`s${i}`, `2026-07-07T00:0${i}:00.000Z`, i));
      }
      const { samples, truncated } = repo.gaugeHistory(undefined, undefined, 3);
      expect(truncated).toBe(true);
      // Newest 3 (queueDepth 2,3,4), returned oldest-first.
      expect(samples.map((s) => s.queueDepth)).toEqual([2, 3, 4]);
    });

    it('prunes samples older than the cutoff, keeping newer ones', () => {
      repo.insertGaugeSample(sample('old', '2026-06-01T00:00:00.000Z'));
      repo.insertGaugeSample(sample('new', '2026-07-07T00:00:00.000Z'));
      const deleted = repo.pruneGaugeSamplesBefore('2026-07-01T00:00:00.000Z');
      expect(deleted).toBe(1);
      const { samples } = repo.gaugeHistory(undefined, undefined, 100);
      expect(samples.map((s) => s.id)).toEqual(['new']);
    });
  });

  describe('cycleRows (Phase 61 C)', () => {
    const WIN_FROM = '2026-06-01T00:00:00.000Z';
    const WIN_TO = '2026-06-30T23:59:59.999Z';

    it('extracts first-wip and final-done per completed task', () => {
      seedTask('t1', { createdAt: '2026-06-01T00:00:00.000Z' });
      seedStatusEvent('t1', 'wip', '2026-06-01T01:00:00.000Z');
      // A bounce back to wip — first-wip stays the earlier one.
      seedStatusEvent('t1', 'todo', '2026-06-01T02:00:00.000Z');
      seedStatusEvent('t1', 'wip', '2026-06-01T03:00:00.000Z');
      seedStatusEvent('t1', 'done', '2026-06-01T05:00:00.000Z');

      const rows = repo.cycleRows(WIN_FROM, WIN_TO);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: 't1',
        createdAt: '2026-06-01T00:00:00.000Z',
        firstWipAt: '2026-06-01T01:00:00.000Z',
        doneAt: '2026-06-01T05:00:00.000Z',
      });
    });

    it('windows by the final-done timestamp', () => {
      seedTask('early', { createdAt: '2026-05-01T00:00:00.000Z' });
      seedStatusEvent('early', 'done', '2026-05-15T00:00:00.000Z'); // before window
      seedTask('inside');
      seedStatusEvent('inside', 'done', '2026-06-10T00:00:00.000Z');

      const rows = repo.cycleRows(WIN_FROM, WIN_TO);
      expect(rows.map((r) => r.id)).toEqual(['inside']);
    });

    it('yields a null firstWipAt when the task never entered wip', () => {
      seedTask('t1');
      seedStatusEvent('t1', 'done', '2026-06-10T00:00:00.000Z');
      const rows = repo.cycleRows(WIN_FROM, WIN_TO);
      expect(rows[0]?.firstWipAt).toBeNull();
    });

    it('ignores tasks that are not currently done', () => {
      seedTask('wip1', { status: 'wip' });
      seedStatusEvent('wip1', 'wip', '2026-06-10T00:00:00.000Z');
      expect(repo.cycleRows(WIN_FROM, WIN_TO)).toEqual([]);
    });

    it('carries repo / project / priority for grouping', () => {
      seedTask('t1', { repo: 'acme/api', projectId: 'p1', priority: 3 });
      seedStatusEvent('t1', 'done', '2026-06-10T00:00:00.000Z');
      expect(repo.cycleRows(WIN_FROM, WIN_TO)[0]).toMatchObject({
        repo: 'acme/api',
        projectId: 'p1',
        priority: 3,
      });
    });
  });

  describe('retryOverheadByTask (Phase 61 C)', () => {
    it('sums duration of retry attempts (retryCount > 0) per task, ignoring first runs', () => {
      repo.insertStart(run('r0', { taskId: 't1', retryCount: 0 }));
      repo.recordEnd('r0', '2026-06-01T00:01:00.000Z', 60_000, 'failed'); // first attempt, excluded
      repo.insertStart(run('r1', { taskId: 't1', retryCount: 1 }));
      repo.recordEnd('r1', '2026-06-01T00:02:00.000Z', 30_000, 'failed');
      repo.insertStart(run('r2', { taskId: 't1', retryCount: 2 }));
      repo.recordEnd('r2', '2026-06-01T00:03:00.000Z', 20_000, 'done');

      const map = repo.retryOverheadByTask();
      expect(map.get('t1')).toEqual({ retryOverheadMs: 50_000, retryAttempts: 2 });
    });

    it('omits tasks with no retries', () => {
      repo.insertStart(run('r0', { taskId: 't1', retryCount: 0 }));
      repo.recordEnd('r0', '2026-06-01T00:01:00.000Z', 60_000, 'done');
      expect(repo.retryOverheadByTask().has('t1')).toBe(false);
    });
  });
});
