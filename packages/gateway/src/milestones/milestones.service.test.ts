import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Task, TaskSummary } from '@midnite/shared';
import { MilestonesService } from './milestones.service';
import type { RoadmapMilestoneInsert, RoadmapMilestoneRow } from '../db/schema';

// In-memory fake mirroring MilestonesRepository's surface.
function makeRepo() {
  const rows = new Map<string, RoadmapMilestoneRow>();
  return {
    rows,
    insert: vi.fn((row: RoadmapMilestoneInsert) => {
      const full = {
        description: null,
        targetDate: null,
        createdBy: null,
        teamId: null,
        position: 0,
        ...row,
      } as RoadmapMilestoneRow;
      rows.set(row.id, full);
      return full;
    }),
    getById: vi.fn((id: string) => rows.get(id)),
    listByProject: vi.fn((projectId: string) =>
      [...rows.values()]
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => a.position - b.position),
    ),
    nextPosition: vi.fn((projectId: string) =>
      [...rows.values()]
        .filter((r) => r.projectId === projectId)
        .reduce((max, r) => Math.max(max, r.position + 1), 0),
    ),
    update: vi.fn((id: string, patch: Partial<RoadmapMilestoneInsert>) => {
      const cur = rows.get(id);
      if (!cur) return undefined;
      const next = { ...cur, ...patch } as RoadmapMilestoneRow;
      rows.set(id, next);
      return next;
    }),
    delete: vi.fn((id: string) => void rows.delete(id)),
    reorder: vi.fn((projectId: string, orderedIds: string[]) => {
      orderedIds.forEach((id, position) => {
        const cur = rows.get(id);
        if (cur && cur.projectId === projectId) rows.set(id, { ...cur, position });
      });
    }),
  };
}

// Projects fake — getProject throws for unknown ids (scope check).
function makeProjects(known: string[]) {
  return {
    getProject: vi.fn((id: string) => {
      if (!known.includes(id)) throw new Error(`project ${id} not found`);
      return { id };
    }),
  };
}

// Tasks fake — a task registry + the milestone-side operations the service calls.
function makeTasks(tasks: Record<string, { projectId?: string; status?: string; milestoneId?: string }>) {
  const store = new Map(Object.entries(tasks));
  return {
    store,
    getTask: vi.fn((id: string): Task => {
      const t = store.get(id);
      if (!t) throw new Error(`task ${id} not found`);
      return { id, projectId: t.projectId, milestoneId: t.milestoneId } as Task;
    }),
    setMilestone: vi.fn((id: string, milestoneId: string | null): Task => {
      const t = store.get(id) ?? {};
      store.set(id, { ...t, milestoneId: milestoneId ?? undefined });
      return { id, milestoneId: milestoneId ?? undefined } as Task;
    }),
    clearMilestone: vi.fn((milestoneId: string): string[] => {
      const cleared: string[] = [];
      for (const [id, t] of store) {
        if (t.milestoneId === milestoneId) {
          store.set(id, { ...t, milestoneId: undefined });
          cleared.push(id);
        }
      }
      return cleared;
    }),
    listTaskSummaries: vi.fn((_status, projectId: string) => {
      const items = [...store.entries()]
        .filter(([, t]) => t.projectId === projectId)
        .map(([id, t]) => ({ id, projectId, status: t.status ?? 'todo', milestoneId: t.milestoneId } as TaskSummary));
      return { items, total: items.length };
    }),
  };
}

const search = { upsert: vi.fn(), remove: vi.fn() };
const audit = { record: vi.fn() };

function makeService(opts?: {
  repo?: ReturnType<typeof makeRepo>;
  projects?: ReturnType<typeof makeProjects>;
  tasks?: ReturnType<typeof makeTasks>;
}) {
  const repo = opts?.repo ?? makeRepo();
  const projects = opts?.projects ?? makeProjects(['p1']);
  const tasks = opts?.tasks ?? makeTasks({});
  const svc = new MilestonesService(repo as never, projects as never, tasks as never, search as never, audit as never);
  return { svc, repo, projects, tasks };
}

beforeEach(() => vi.clearAllMocks());

describe('MilestonesService.create', () => {
  it('appends at the next position, stamps scope, and indexes', () => {
    const { svc, repo } = makeService();
    const a = svc.create('p1', { name: 'Alpha' }, { userId: 'u1', teamId: 'team-1' });
    expect(a.position).toBe(0);
    expect(a.createdBy).toBe('u1');
    expect(a.teamId).toBe('team-1');
    const b = svc.create('p1', { name: 'Beta' });
    expect(b.position).toBe(1);
    expect(repo.insert).toHaveBeenCalledTimes(2);
    expect(search.upsert).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'milestone', action: 'milestone.created' }),
    );
  });

  it('404s an unknown project', () => {
    const { svc } = makeService();
    expect(() => svc.create('ghost', { name: 'X' })).toThrow(/not found/);
  });
});

describe('MilestonesService.update', () => {
  it('clears targetDate when null is sent, keeps unset fields', () => {
    const { svc } = makeService();
    const m = svc.create('p1', { name: 'M', targetDate: '2026-08-01' });
    const updated = svc.update(m.id, { targetDate: null });
    expect(updated.targetDate).toBeUndefined();
    expect(updated.name).toBe('M');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'milestone.updated' }));
  });

  it('404s an unknown id', () => {
    const { svc } = makeService();
    expect(() => svc.update('nope', { name: 'x' })).toThrow(/not found/);
  });
});

describe('MilestonesService.delete', () => {
  it('unassigns its tasks (not delete) and removes the search row', () => {
    const tasks = makeTasks({ t1: { projectId: 'p1' }, t2: { projectId: 'p1' } });
    const { svc } = makeService({ tasks });
    const m = svc.create('p1', { name: 'M' });
    tasks.store.set('t1', { projectId: 'p1', milestoneId: m.id });
    svc.delete(m.id);
    expect(tasks.clearMilestone).toHaveBeenCalledWith(m.id);
    expect(search.remove).toHaveBeenCalledWith('milestone', m.id);
    expect(() => svc.getMilestone(m.id)).toThrow(/not found/);
  });
});

describe('MilestonesService.reorder', () => {
  it('reassigns positions from a full ordered id list', () => {
    const { svc } = makeService();
    const a = svc.create('p1', { name: 'A' });
    const b = svc.create('p1', { name: 'B' });
    const c = svc.create('p1', { name: 'C' });
    const out = svc.reorder('p1', [c.id, a.id, b.id]);
    expect(out.map((m) => m.name)).toEqual(['C', 'A', 'B']);
  });

  it('rejects a list that is not exactly the current set', () => {
    const { svc } = makeService();
    const a = svc.create('p1', { name: 'A' });
    svc.create('p1', { name: 'B' });
    expect(() => svc.reorder('p1', [a.id])).toThrow(/every current milestone/);
  });
});

describe('MilestonesService.assignTask', () => {
  it('assigns a task to a same-project milestone', () => {
    const tasks = makeTasks({ t1: { projectId: 'p1' } });
    const { svc } = makeService({ tasks });
    const m = svc.create('p1', { name: 'M' });
    svc.assignTask('t1', m.id);
    expect(tasks.setMilestone).toHaveBeenCalledWith('t1', m.id, undefined);
  });

  it('rejects a cross-project assignment', () => {
    const projects = makeProjects(['p1', 'p2']);
    const tasks = makeTasks({ t2: { projectId: 'p2' } });
    const { svc } = makeService({ projects, tasks });
    const m = svc.create('p1', { name: 'M' });
    expect(() => svc.assignTask('t2', m.id)).toThrow(/same project/);
    expect(tasks.setMilestone).not.toHaveBeenCalled();
  });

  it('unassigns (null) without a milestone lookup', () => {
    const tasks = makeTasks({ t1: { projectId: 'p1', milestoneId: 'm-old' } });
    const { svc } = makeService({ tasks });
    svc.assignTask('t1', null);
    expect(tasks.setMilestone).toHaveBeenCalledWith('t1', null, undefined);
  });
});

describe('MilestonesService.getRoadmap', () => {
  it('computes per-milestone progress and buckets unassigned tasks into the backlog', () => {
    const { svc, tasks } = (() => {
      const t = makeTasks({});
      return { ...makeService({ tasks: t }), tasks: t };
    })();
    const m = svc.create('p1', { name: 'M' });
    tasks.store.set('done1', { projectId: 'p1', status: 'done', milestoneId: m.id });
    tasks.store.set('wip1', { projectId: 'p1', status: 'wip', milestoneId: m.id });
    tasks.store.set('loose', { projectId: 'p1', status: 'todo' });

    const roadmap = svc.getRoadmap('p1');
    expect(roadmap.milestones).toHaveLength(1);
    expect(roadmap.milestones[0]?.total).toBe(2);
    expect(roadmap.milestones[0]?.done).toBe(1);
    expect(roadmap.milestones[0]?.tasks).toHaveLength(2);
    expect(roadmap.backlog.map((t) => t.id)).toEqual(['loose']);
  });
});
