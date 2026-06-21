import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tasks } from '../db/schema';
import { createTestDb, type TestDbHandle } from './db';

describe('createTestDb', () => {
  let handle: TestDbHandle;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
  });

  it('applies migrations so schema tables exist', () => {
    const names = handle.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => (r as { name: string }).name);
    // A representative spread of domain tables proves the migration chain ran.
    expect(names).toEqual(expect.arrayContaining(['tasks', 'projects', 'memories']));
  });

  it('enables foreign-key enforcement', () => {
    const fk = handle.sqlite.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
  });

  it('exposes a usable Drizzle handle against the migrated schema', () => {
    const rows = handle.db.select().from(tasks).all();
    expect(rows).toEqual([]);
  });

  it('isolates each instance — writes do not leak between databases', () => {
    const other = createTestDb();
    try {
      handle.sqlite
        .prepare(
          "INSERT INTO tasks (id, title, kind, status, created_at, updated_at, priority, retry_count) VALUES ('t1', 't1', 'unknown', 'todo', '2026-06-21T00:00:00.000Z', '2026-06-21T00:00:00.000Z', 1, 0)",
        )
        .run();
      const here = handle.sqlite.prepare('SELECT count(*) AS n FROM tasks').get() as { n: number };
      const there = other.sqlite.prepare('SELECT count(*) AS n FROM tasks').get() as { n: number };
      expect(here.n).toBe(1);
      expect(there.n).toBe(0);
    } finally {
      other.close();
    }
  });

  it('frees the connection on close', () => {
    const temp = createTestDb();
    temp.close();
    expect(() => temp.sqlite.prepare('SELECT 1').get()).toThrow();
  });
});
