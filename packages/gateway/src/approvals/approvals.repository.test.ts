import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { ApprovalsRepository } from './approvals.repository';

function makeRepo() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return new ApprovalsRepository(db);
}

const base: schema.ApprovalRuleInsert = {
  id: 'rule-1',
  enabled: true,
  effect: 'allow',
  toolName: 'Read',
  match: null,
  scope: 'global',
  note: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ApprovalsRepository', () => {
  it('inserts and retrieves a rule', () => {
    const repo = makeRepo();
    const row = repo.insert(base);
    expect(row.id).toBe('rule-1');
    expect(row.effect).toBe('allow');
    expect(repo.get('rule-1')).toEqual(row);
  });

  it('lists all rules ordered by createdAt', () => {
    const repo = makeRepo();
    repo.insert({ ...base, id: 'r1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' });
    repo.insert({ ...base, id: 'r2', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' });
    const rows = repo.list();
    expect(rows.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('listEnabled excludes disabled rules', () => {
    const repo = makeRepo();
    repo.insert({ ...base, id: 'r1', enabled: true });
    repo.insert({ ...base, id: 'r2', enabled: false });
    expect(repo.listEnabled().map((r) => r.id)).toEqual(['r1']);
  });

  it('listEnabledForTool matches tool name and wildcard', () => {
    const repo = makeRepo();
    repo.insert({ ...base, id: 'r1', toolName: 'Read', enabled: true });
    repo.insert({ ...base, id: 'r2', toolName: '*', enabled: true });
    repo.insert({ ...base, id: 'r3', toolName: 'Bash', enabled: true });
    const matches = repo.listEnabledForTool('Read');
    expect(matches.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('listEnabledForTool skips disabled rules', () => {
    const repo = makeRepo();
    repo.insert({ ...base, id: 'r1', toolName: 'Read', enabled: true });
    repo.insert({ ...base, id: 'r2', toolName: 'Read', enabled: false });
    expect(repo.listEnabledForTool('Read').map((r) => r.id)).toEqual(['r1']);
  });

  it('updates a rule', () => {
    const repo = makeRepo();
    repo.insert(base);
    const updated = repo.update('rule-1', { enabled: false, updatedAt: '2026-06-01T00:00:00.000Z' });
    expect(updated?.enabled).toBe(false);
  });

  it('update returns undefined for missing rule', () => {
    const repo = makeRepo();
    expect(repo.update('missing', { enabled: false })).toBeUndefined();
  });

  it('removes a rule and returns true', () => {
    const repo = makeRepo();
    repo.insert(base);
    expect(repo.remove('rule-1')).toBe(true);
    expect(repo.get('rule-1')).toBeUndefined();
  });

  it('remove returns false for missing rule', () => {
    const repo = makeRepo();
    expect(repo.remove('missing')).toBe(false);
  });

  it('stores and returns match JSON', () => {
    const repo = makeRepo();
    const matchJson = JSON.stringify({ commandPrefix: ['git status'] });
    repo.insert({ ...base, match: matchJson });
    const row = repo.get('rule-1');
    expect(row?.match).toBe(matchJson);
  });
});
