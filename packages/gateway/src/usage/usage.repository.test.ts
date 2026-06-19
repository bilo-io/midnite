import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import type { LlmUsageInsert } from '../db/schema';
import { UsageRepository } from './usage.repository';

// Exercises the real Drizzle queries + migration 0024 (llm_usage) on in-memory
// SQLite. Confirms the new migration applies cleanly on a fresh DB.
function makeRepo() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return new UsageRepository(db);
}

function row(over: Partial<LlmUsageInsert>): LlmUsageInsert {
  return {
    id: randomUUID(),
    at: '2026-06-19T12:00:00.000Z',
    provider: 'anthropic',
    model: 'claude-opus-4-8',
    feature: 'classifier',
    inputTokens: 100,
    outputTokens: 50,
    estCostUsd: 0.005,
    correlationId: null,
    ...over,
  };
}

let repo: UsageRepository;
beforeEach(() => {
  repo = makeRepo();
});

describe('UsageRepository', () => {
  it('inserts a row and reads it back', () => {
    repo.insert(row({ at: '2026-06-19T01:00:00.000Z' }));
    const all = repo.listInRange();
    expect(all).toHaveLength(1);
    expect(all[0]?.provider).toBe('anthropic');
    expect(all[0]?.inputTokens).toBe(100);
  });

  it('filters by an inclusive [from, to] window', () => {
    repo.insert(row({ at: '2026-06-17T12:00:00.000Z' }));
    repo.insert(row({ at: '2026-06-18T12:00:00.000Z' }));
    repo.insert(row({ at: '2026-06-19T12:00:00.000Z' }));

    expect(repo.listInRange('2026-06-18T00:00:00.000Z')).toHaveLength(2);
    expect(repo.listInRange(undefined, '2026-06-18T23:59:59.999Z')).toHaveLength(2);
    expect(
      repo.listInRange('2026-06-18T00:00:00.000Z', '2026-06-18T23:59:59.999Z'),
    ).toHaveLength(1);
  });
});
