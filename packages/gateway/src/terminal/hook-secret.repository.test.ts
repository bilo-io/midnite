import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { HookSecretRepository } from './hook-secret.repository';

describe('HookSecretRepository', () => {
  let repo: HookSecretRepository;

  beforeEach(() => {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
    repo = new HookSecretRepository(db);
  });

  it('upserts then finds a session secret hash', () => {
    repo.upsert('s1', 'hash-1', '2026-06-22T00:00:00.000Z');
    expect(repo.find('s1')).toBe('hash-1');
    expect(repo.find('missing')).toBeUndefined();
  });

  it('overwrites the hash on a repeat upsert (re-mint)', () => {
    repo.upsert('s1', 'hash-1', '2026-06-22T00:00:00.000Z');
    repo.upsert('s1', 'hash-2', '2026-06-22T01:00:00.000Z');
    expect(repo.find('s1')).toBe('hash-2');
  });

  it('deletes a session secret', () => {
    repo.upsert('s1', 'hash-1', '2026-06-22T00:00:00.000Z');
    repo.delete('s1');
    expect(repo.find('s1')).toBeUndefined();
    // deleting a missing row is a no-op
    expect(() => repo.delete('s1')).not.toThrow();
  });
});
