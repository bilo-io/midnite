import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { media, roadmapMilestones, tasks } from '../db/schema';
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
  it('inserts and hydrates a project with a task count', () => {
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

  it('deleting a project unlinks its tasks', () => {
    const { db, repo } = ctx;
    repo.insertProject({
      id: 'p1',
      name: 'Atlas',
      tag: 'atlas',
      color: '#000000',
      createdAt: now,
      updatedAt: now,
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

  it('deleteProject cascade-cleans every cross-domain ref (Phase 60 F)', () => {
    const { db, repo } = ctx;
    repo.insertProject({
      id: 'p1',
      name: 'Atlas',
      tag: 'atlas',
      color: '#7c3aed',
      plan: null,
      planUpdatedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    // A milestone under the project + a task tagged to both project and milestone.
    db.insert(roadmapMilestones)
      .values({ id: 'm1', projectId: 'p1', name: 'v1', position: 0, createdAt: now, updatedAt: now })
      .run();
    db.insert(tasks)
      .values({
        id: 't1',
        title: 'Task',
        kind: 'feature',
        status: 'todo',
        projectId: 'p1',
        milestoneId: 'm1',
        createdAt: now,
        updatedAt: now,
      })
      .run();
    // Media under the project.
    db.insert(media)
      .values({ id: 'md1', projectId: 'p1', type: 'image', title: 'Pic', createdAt: now, updatedAt: now })
      .run();

    repo.deleteProject('p1');

    // Project + its milestone gone; the task + media survive but fully unlinked —
    // no dangling projectId/milestoneId (no phantom chips).
    expect(repo.getProject('p1')).toBeUndefined();
    expect(db.select().from(roadmapMilestones).where(eq(roadmapMilestones.id, 'm1')).all()).toHaveLength(0);
    const task = db.select().from(tasks).where(eq(tasks.id, 't1')).get()!;
    expect(task.projectId).toBeNull();
    expect(task.milestoneId).toBeNull();
    const md = db.select().from(media).where(eq(media.id, 'md1')).get()!;
    expect(md.projectId).toBeNull();
  });

  it('listProjectPage returns the full total but only the requested window (Phase 57 C)', () => {
    const { repo } = ctx;
    for (let i = 0; i < 5; i++) {
      repo.insertProject({
        id: `p${i}`,
        name: `P${i}`,
        description: null,
        tag: `t${i}`,
        color: '#7c3aed',
        plan: null,
        planUpdatedAt: null,
        // Ascending createdAt so the order is deterministic (p0 … p4).
        createdAt: `2026-06-04T00:00:0${i}.000Z`,
        updatedAt: now,
      });
    }

    // Omitted page/limit → every row, total = full set.
    const all = repo.listProjectPage();
    expect(all.total).toBe(5);
    expect(all.rows).toHaveLength(5);

    // A window: total stays the full count, rows are just the page.
    const page2 = repo.listProjectPage(undefined, { page: 2, limit: 2 });
    expect(page2.total).toBe(5);
    expect(page2.rows.map((r) => r.id)).toEqual(['p2', 'p3']);
  });
});
