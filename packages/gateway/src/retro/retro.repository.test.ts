import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { RetroRepository } from './retro.repository';
import { agentRunStats, taskEvents, taskFailures } from '../db/schema';

// createTestDb migrates a fresh :memory: SQLite, so task_retros (0074) exists.
let db: ReturnType<typeof createTestDb>['db'];
let repo: RetroRepository;

beforeEach(() => {
  db = createTestDb().db;
  repo = new RetroRepository(db);
});

function retroRow(taskId: string, outcome = 'done') {
  return {
    id: `r-${taskId}`,
    taskId,
    outcome,
    hasNarrative: 0,
    retro: JSON.stringify({ taskId, outcome }),
    createdAt: '2026-07-07T10:00:00.000Z',
    updatedAt: '2026-07-07T10:00:00.000Z',
  };
}

describe('RetroRepository (migration smoke + CRUD)', () => {
  it('upserts one row per task and reads it back', () => {
    repo.upsert(retroRow('t1'));
    expect(repo.getByTaskId('t1')?.outcome).toBe('done');
  });

  it('upsert on the same task updates in place (no duplicate row)', () => {
    repo.upsert(retroRow('t1', 'abandoned'));
    repo.upsert({ ...retroRow('t1', 'done'), retro: JSON.stringify({ taskId: 't1', outcome: 'done' }), updatedAt: '2026-07-07T11:00:00.000Z' });
    const row = repo.getByTaskId('t1');
    expect(row?.outcome).toBe('done');
    expect(row?.updatedAt).toBe('2026-07-07T11:00:00.000Z');
    // createdAt preserved from the first insert (not in the update set).
    expect(row?.createdAt).toBe('2026-07-07T10:00:00.000Z');
  });

  it('returns undefined for an unknown task', () => {
    expect(repo.getByTaskId('nope')).toBeUndefined();
  });

  it('reads task-scoped events / run stats / failures in time order', () => {
    db.insert(taskEvents).values([
      { id: 'e2', taskId: 't1', at: '2026-07-07T09:30:00.000Z', kind: 'b', data: null },
      { id: 'e1', taskId: 't1', at: '2026-07-07T09:00:00.000Z', kind: 'a', data: null },
      { id: 'e3', taskId: 't2', at: '2026-07-07T09:00:00.000Z', kind: 'other', data: null },
    ]).run();
    db.insert(agentRunStats).values([
      { id: 's1', taskId: 't1', startedAt: '2026-07-07T09:05:00.000Z', endedAt: null, durationMs: null, outcome: null, retryCount: 0, repo: null },
    ]).run();
    db.insert(taskFailures).values([
      { id: 'f1', taskId: 't1', class: 'crash', detail: 'x', exitCode: 1, lastOutput: null, retryIndex: 0, teamId: null, at: '2026-07-07T09:10:00.000Z' },
    ]).run();

    expect(repo.events('t1').map((e) => e.id)).toEqual(['e1', 'e2']); // asc by at, t2 excluded
    expect(repo.runStats('t1')).toHaveLength(1);
    expect(repo.failures('t1')).toHaveLength(1);
    expect(repo.checkRuns('t1')).toHaveLength(0);
  });
});
