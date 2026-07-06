import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { tasks } from '../db/schema';
import { createTestDb } from '../test';
import { ProjectsRepository } from './projects.repository';

function makeRepo() {
  const { db } = createTestDb();
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
    expect(project.taskStatusCounts).toEqual({ todo: 1 });
  });

  it('computes per-status counts, batched and single (Phase 58 C)', () => {
    const { db, repo } = ctx;
    for (const id of ['p1', 'p2']) {
      repo.insertProject({ id, name: id, tag: id, color: '#000000', createdAt: now, updatedAt: now });
    }
    const seed = (id: string, projectId: string, status: string) =>
      db
        .insert(tasks)
        .values({ id, title: id, kind: 'unknown', status, projectId, createdAt: now, updatedAt: now })
        .run();
    // p1: 2 done, 1 wip, 1 abandoned → done 2 / total 4 = 50%
    seed('a1', 'p1', 'done');
    seed('a2', 'p1', 'done');
    seed('a3', 'p1', 'wip');
    seed('a4', 'p1', 'abandoned');
    // p2: 1 todo
    seed('b1', 'p2', 'todo');

    expect(repo.statusCountsForProject('p1')).toEqual({ done: 2, wip: 1, abandoned: 1 });

    const batched = repo.statusCountsForProjects(['p1', 'p2']);
    expect(batched.get('p1')).toEqual({ done: 2, wip: 1, abandoned: 1 });
    expect(batched.get('p2')).toEqual({ todo: 1 });

    // A project with no tasks is absent from the batch and hydrates to an empty map.
    repo.insertProject({ id: 'p3', name: 'p3', tag: 'p3', color: '#000000', createdAt: now, updatedAt: now });
    expect(repo.statusCountsForProjects(['p1', 'p2', 'p3']).get('p3')).toBeUndefined();
    const p3 = repo.hydrate(repo.getProject('p3')!);
    expect(p3.taskCount).toBe(0);
    expect(p3.taskStatusCounts).toEqual({});
  });

  it('statusCountsForProjects is empty for no ids', () => {
    expect(ctx.repo.statusCountsForProjects([]).size).toBe(0);
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
