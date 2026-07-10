import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { MemoryArtifactsRepository } from './memory-artifacts.repository';

// Exercises the real Drizzle queries + migration 0079 (memory_artifacts) against
// an in-memory SQLite — proves the hand-written migration applies cleanly.
function makeRepo() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return new MemoryArtifactsRepository(db);
}

let repo: MemoryArtifactsRepository;
const now = '2026-07-10T00:00:00.000Z';

beforeEach(() => {
  repo = makeRepo();
});

function insertBrief(memoryId: string, id: string, status = 'pending') {
  return repo.insert({
    id,
    memoryId,
    kind: 'brief',
    format: 'markdown',
    title: 'Executive brief',
    content: '',
    status,
    error: null,
    createdAt: now,
    updatedAt: now,
  });
}

describe('MemoryArtifactsRepository', () => {
  it('inserts, lists (by createdAt) and scopes to the memory', () => {
    insertBrief('m1', 'a1');
    repo.insert({
      id: 'a2',
      memoryId: 'm1',
      kind: 'faq',
      format: 'markdown',
      title: 'FAQ',
      content: '',
      status: 'pending',
      error: null,
      createdAt: '2026-07-10T00:00:01.000Z',
      updatedAt: now,
    });
    insertBrief('m2', 'a3');

    const list = repo.list('m1');
    expect(list.map((r) => r.id)).toEqual(['a1', 'a2']);
    expect(repo.list('m2')).toHaveLength(1);
  });

  it('finds an existing artifact by kind (one per kind)', () => {
    insertBrief('m1', 'a1');
    expect(repo.getByKind('m1', 'brief')?.id).toBe('a1');
    expect(repo.getByKind('m1', 'faq')).toBeUndefined();
  });

  it('updates status + content on completion and hydrates the wire shape', () => {
    insertBrief('m1', 'a1');
    repo.update('a1', { status: 'ready', content: '# Hi', updatedAt: '2026-07-10T00:01:00.000Z' });
    const row = repo.get('m1', 'a1')!;
    expect(repo.hydrate(row)).toMatchObject({
      id: 'a1',
      memoryId: 'm1',
      kind: 'brief',
      format: 'markdown',
      status: 'ready',
      content: '# Hi',
      error: null,
    });
  });

  it('deletes only within the owning memory', () => {
    insertBrief('m1', 'a1');
    repo.delete('m2', 'a1'); // wrong memory — no-op
    expect(repo.get('m1', 'a1')).toBeDefined();
    repo.delete('m1', 'a1');
    expect(repo.get('m1', 'a1')).toBeUndefined();
  });
});
