import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import type { MidniteDb } from '../db/db.module';
import { SessionUsageRepository } from './session-usage.repository';
import { tasks, type SessionUsageInsert } from '../db/schema';

let repo: SessionUsageRepository;
let db: MidniteDb;

beforeEach(() => {
  db = createTestDb().db;
  repo = new SessionUsageRepository(db);
});

function insertTask(id: string, over: { title?: string; repo?: string; projectId?: string } = {}) {
  db.insert(tasks)
    .values({
      id,
      title: over.title ?? `Task ${id}`,
      kind: 'unknown',
      status: 'done',
      repo: over.repo ?? null,
      projectId: over.projectId ?? null,
      createdAt: '2026-07-08T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z',
    })
    .run();
}

function row(sessionId: string, overrides: Partial<SessionUsageInsert> = {}): SessionUsageInsert {
  return {
    sessionId,
    agentCli: 'claude',
    model: 'claude-sonnet-4-6',
    inputTokens: 100,
    outputTokens: 50,
    cachedReadTokens: 10,
    cachedWriteTokens: 5,
    contextTokens: 40_000,
    estCostUsd: 0.01,
    updatedAt: '2026-07-08T00:00:00.000Z',
    ...overrides,
  };
}

describe('SessionUsageRepository', () => {
  it('upserts and reads a row back', () => {
    repo.upsert(row('t1'));
    const got = repo.get('t1');
    expect(got?.inputTokens).toBe(100);
    expect(got?.contextTokens).toBe(40_000);
    expect(got?.estCostUsd).toBe(0.01);
  });

  it('upsert replaces on the same session id (pk)', () => {
    repo.upsert(row('t1', { inputTokens: 100 }));
    repo.upsert(row('t1', { inputTokens: 999, contextTokens: 55_000 }));
    const got = repo.get('t1');
    expect(got?.inputTokens).toBe(999);
    expect(got?.contextTokens).toBe(55_000);
  });

  it('stores a null est_cost_usd (unpriced model)', () => {
    repo.upsert(row('t1', { estCostUsd: null, model: 'mystery' }));
    expect(repo.get('t1')?.estCostUsd).toBeNull();
  });

  it('get returns undefined for an unknown session', () => {
    expect(repo.get('nope')).toBeUndefined();
  });

  it('getMany returns only the requested rows', () => {
    repo.upsert(row('t1'));
    repo.upsert(row('t2'));
    repo.upsert(row('t3'));
    const rows = repo.getMany(['t1', 't3', 'missing']);
    expect(rows.map((r) => r.sessionId).sort()).toEqual(['t1', 't3']);
    expect(repo.getMany([])).toEqual([]);
  });

  describe('listAttributionInRange (Phase 61 B)', () => {
    it('joins each session to its task title/repo/project', () => {
      insertTask('t1', { title: 'Ship it', repo: 'midnite', projectId: 'proj-1' });
      repo.upsert(row('t1'));
      const [got] = repo.listAttributionInRange();
      expect(got).toMatchObject({
        sessionId: 't1',
        taskTitle: 'Ship it',
        repo: 'midnite',
        projectId: 'proj-1',
        inputTokens: 100,
        estCostUsd: 0.01,
      });
    });

    it('left-joins — a session whose task was deleted still returns (null repo)', () => {
      repo.upsert(row('orphan'));
      const [got] = repo.listAttributionInRange();
      expect(got?.sessionId).toBe('orphan');
      expect(got?.repo).toBeNull();
      expect(got?.taskTitle).toBeNull();
    });

    it('filters by the harvest window (updatedAt)', () => {
      insertTask('old');
      insertTask('new');
      repo.upsert(row('old', { updatedAt: '2026-05-01T00:00:00.000Z' }));
      repo.upsert(row('new', { updatedAt: '2026-07-08T00:00:00.000Z' }));
      const rows = repo.listAttributionInRange('2026-06-01T00:00:00.000Z');
      expect(rows.map((r) => r.sessionId)).toEqual(['new']);
    });
  });
});
