import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { SsoStateRepository } from './sso-state.repository';

function makeRepo(): SsoStateRepository {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  return new SsoStateRepository(db);
}

describe('SsoStateRepository', () => {
  let repo: SsoStateRepository;
  const now = 1_700_000_000_000;

  beforeEach(() => {
    repo = makeRepo();
  });

  it('inserts and consumes a nonce exactly once', () => {
    repo.insert({ id: 'n1', kind: 'nonce', provider: 'google', redirect: '/board', userId: null, expiresAt: now + 1000, createdAt: 'x' });
    const first = repo.take('n1', 'nonce');
    expect(first?.redirect).toBe('/board');
    // Single-use: the second take finds nothing (replay guard).
    expect(repo.take('n1', 'nonce')).toBeUndefined();
  });

  it('does not consume a row of the wrong kind', () => {
    repo.insert({ id: 'c1', kind: 'code', provider: 'github', redirect: null, userId: 'u1', expiresAt: now + 1000, createdAt: 'x' });
    expect(repo.take('c1', 'nonce')).toBeUndefined();
    expect(repo.take('c1', 'code')?.userId).toBe('u1');
  });

  it('prunes expired rows', () => {
    repo.insert({ id: 'old', kind: 'nonce', provider: 'google', redirect: null, userId: null, expiresAt: now - 1, createdAt: 'x' });
    repo.insert({ id: 'fresh', kind: 'nonce', provider: 'google', redirect: null, userId: null, expiresAt: now + 10_000, createdAt: 'x' });
    repo.pruneExpired(now);
    expect(repo.take('old', 'nonce')).toBeUndefined();
    expect(repo.take('fresh', 'nonce')).toBeDefined();
  });
});
