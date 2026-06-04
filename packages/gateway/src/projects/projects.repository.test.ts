import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { tasks } from '../db/schema';
import { ProjectsRepository } from './projects.repository';

function makeRepo() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return { db, repo: new ProjectsRepository(db) };
}

let ctx: ReturnType<typeof makeRepo>;
const now = '2026-06-04T00:00:00.000Z';

beforeEach(() => {
  ctx = makeRepo();
});

describe('ProjectsRepository', () => {
  it('inserts and hydrates a project with sources and a task count', () => {
    const { db, repo } = ctx;
    repo.insertProject({
      id: 'p1',
      name: 'Atlas',
      description: 'desc',
      tag: 'atlas',
      color: '#7c3aed',
      plan: null,
      planUpdatedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    repo.insertSource({
      id: 's1',
      projectId: 'p1',
      url: 'https://youtu.be/x',
      kind: 'youtube',
      title: 'A video',
      faviconUrl: 'https://www.youtube.com/favicon.ico',
      fetchedAt: now,
      createdAt: now,
    });
    db.insert(tasks)
      .values({
        id: 't1',
        title: 'tagged task',
        kind: 'unknown',
        status: 'todo',
        projectId: 'p1',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const row = repo.getProject('p1')!;
    const project = repo.hydrate(row);
    expect(project.name).toBe('Atlas');
    expect(project.sources).toHaveLength(1);
    expect(project.sources[0]!.kind).toBe('youtube');
    expect(project.taskCount).toBe(1);
  });

  it('deleting a project removes sources and unlinks its tasks', () => {
    const { db, repo } = ctx;
    repo.insertProject({
      id: 'p1',
      name: 'Atlas',
      tag: 'atlas',
      color: '#000000',
      createdAt: now,
      updatedAt: now,
    });
    repo.insertSource({
      id: 's1',
      projectId: 'p1',
      url: 'https://example.com',
      kind: 'link',
      createdAt: now,
    });
    db.insert(tasks)
      .values({
        id: 't1',
        title: 'tagged task',
        kind: 'unknown',
        status: 'todo',
        projectId: 'p1',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    repo.deleteProject('p1');

    expect(repo.getProject('p1')).toBeUndefined();
    expect(repo.listSources('p1')).toHaveLength(0);
    const task = db.select().from(tasks).where(eq(tasks.id, 't1')).get();
    expect(task).toBeDefined();
    expect(task!.projectId).toBeNull();
  });

  it('updates project fields', () => {
    const { repo } = ctx;
    repo.insertProject({
      id: 'p1',
      name: 'Old',
      tag: 'old',
      color: '#000000',
      createdAt: now,
      updatedAt: now,
    });
    repo.updateProject('p1', { name: 'New', tag: 'new' });
    const project = repo.hydrate(repo.getProject('p1')!);
    expect(project.name).toBe('New');
    expect(project.tag).toBe('new');
  });
});
