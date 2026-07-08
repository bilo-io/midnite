import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { SessionUsageRepository } from './session-usage.repository';
import type { SessionUsageInsert } from '../db/schema';

let repo: SessionUsageRepository;

beforeEach(() => {
  repo = new SessionUsageRepository(createTestDb().db);
});

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
});
