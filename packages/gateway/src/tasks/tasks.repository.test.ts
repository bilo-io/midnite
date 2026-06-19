import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { TasksRepository } from './tasks.repository';
import type { TaskInsert } from '../db/schema';

function makeRepo() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return new TasksRepository(db);
}

let repo: TasksRepository;

beforeEach(() => {
  repo = makeRepo();
});

// createdAt drives the tie-break, so vary it per insert.
function insert(id: string, partial: Partial<TaskInsert>): void {
  const at = partial.createdAt ?? `2026-06-0${id.slice(-1)}T00:00:00.000Z`;
  repo.insertTask({
    id,
    title: id,
    kind: 'unknown',
    status: 'todo',
    createdAt: at,
    updatedAt: at,
    ...partial,
  });
}

describe('TasksRepository', () => {
  it('defaults priority to 1 (Normal) and retryCount to 0', () => {
    insert('t1', {});
    const row = repo.getTask('t1')!;
    expect(row.priority).toBe(1);
    expect(row.retryCount).toBe(0);
  });

  it('lists todo tasks highest-priority first, then oldest within a priority', () => {
    // Insert deliberately out of priority order.
    insert('low', { priority: 0, createdAt: '2026-06-01T00:00:00.000Z' });
    insert('urgent', { priority: 3, createdAt: '2026-06-02T00:00:00.000Z' });
    insert('normal-old', { priority: 1, createdAt: '2026-06-03T00:00:00.000Z' });
    insert('high', { priority: 2, createdAt: '2026-06-04T00:00:00.000Z' });
    insert('normal-new', { priority: 1, createdAt: '2026-06-05T00:00:00.000Z' });

    const order = repo.listTasks('todo').map((t) => t.id);
    expect(order).toEqual(['urgent', 'high', 'normal-old', 'normal-new', 'low']);
  });

  it('incrementRetry bumps the counter by one', () => {
    insert('t1', {});
    repo.incrementRetry('t1', '2026-06-02T00:00:00.000Z');
    expect(repo.getTask('t1')!.retryCount).toBe(1);
    repo.incrementRetry('t1', '2026-06-03T00:00:00.000Z');
    expect(repo.getTask('t1')!.retryCount).toBe(2);
  });

  it('hydrates tags as [] by default and round-trips a set via setTags', () => {
    insert('t1', {});
    expect(repo.hydrate(repo.getTask('t1')!).tags).toEqual([]);

    repo.setTags('t1', ['bug', 'frontend'], '2026-06-02T00:00:00.000Z');
    expect(repo.hydrate(repo.getTask('t1')!).tags).toEqual(['bug', 'frontend']);

    // Clearing persists an empty set, not null garbage.
    repo.setTags('t1', [], '2026-06-03T00:00:00.000Z');
    expect(repo.hydrate(repo.getTask('t1')!).tags).toEqual([]);
  });
});
