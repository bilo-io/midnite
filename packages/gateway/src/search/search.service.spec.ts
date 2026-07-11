import type {
  Council,
  Memory,
  Note,
  Project,
  Task,
  WorkflowSummary,
} from '@midnite/shared';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MidniteDb } from '../db/db.module';
import type { CouncilsService } from '../councils/councils.service';
import type { DigestsService } from '../digests/digests.service';
import type { IdeaService } from '../ideas/ideas.service';
import type { MemoriesService } from '../memories/memories.service';
import type { NotesService } from '../notes/notes.service';
import type { ProjectsService } from '../projects/projects.service';
import { TaskEventBus } from '../tasks/task-event-bus';
import type { TasksService } from '../tasks/tasks.service';
import type { WorkflowsService } from '../workflows/workflows.service';
import { SearchIndexService } from './search-index.service';
import { SearchService } from './search.service';

type Fixtures = {
  tasks: Task[];
  projects: Project[];
  memories: Memory[];
  notes: Note[];
  councils: Council[];
  workflows: WorkflowSummary[];
};

type Harness = { svc: SearchService; bus: TaskEventBus; fx: Fixtures };

function makeHarness(seed: Partial<Fixtures> = {}): Harness {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, {}) as unknown as MidniteDb;
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  const index = new SearchIndexService(db);

  const fx: Fixtures = {
    tasks: seed.tasks ?? [],
    projects: seed.projects ?? [],
    memories: seed.memories ?? [],
    notes: seed.notes ?? [],
    councils: seed.councils ?? [],
    workflows: seed.workflows ?? [],
  };

  const tasks = {
    listTasks: () => fx.tasks,
    getTask: (id: string) => fx.tasks.find((t) => t.id === id)!,
  } as unknown as TasksService;
  const projects = { listProjects: () => fx.projects } as unknown as ProjectsService;
  const memories = { listMemories: () => fx.memories } as unknown as MemoriesService;
  const notes = { listNotes: () => fx.notes } as unknown as NotesService;
  const councils = { listCouncils: () => fx.councils } as unknown as CouncilsService;
  const workflows = { listSummaries: () => fx.workflows } as unknown as WorkflowsService;
  const ideas = { listIdeas: () => ({ ideas: [], total: 0 }) } as unknown as IdeaService;
  const digests = { listAll: () => [] } as unknown as DigestsService;

  const bus = new TaskEventBus();
  const svc = new SearchService(index, tasks, projects, memories, notes, councils, workflows, bus, ideas, digests);
  return { svc, bus, fx };
}

const task = (id: string, title: string, prompt = ''): Task =>
  ({ id, title, prompt }) as Task;

describe('SearchService', () => {
  describe('query mapping', () => {
    let h: Harness;
    beforeEach(() => {
      h = makeHarness({
        tasks: [task('t1', 'Fix OAuth login', 'token flow')],
        notes: [{ id: 'n1', content: 'oauth notes for later' } as Note],
      });
      h.svc.onApplicationBootstrap(); // backfills + subscribes
    });

    it('returns ranked, routed results grouped by type', () => {
      const res = h.svc.search({ q: 'oauth' });
      expect(res.total).toBe(2);
      expect(res.byType).toEqual({ task: 1, note: 1 });
      const taskHit = res.results.find((r) => r.type === 'task');
      expect(taskHit).toMatchObject({ id: 't1', route: '/tasks' });
      expect(taskHit!.snippet).toContain('<mark>');
    });

    it('filters by type', () => {
      const res = h.svc.search({ q: 'oauth', type: 'note' });
      expect(res.total).toBe(1);
      expect(res.results[0]).toMatchObject({ type: 'note', route: '/dashboard' });
    });

    it('short-circuits a one-character query without scanning', () => {
      expect(h.svc.search({ q: 'a' })).toEqual({ results: [], total: 0, byType: {} });
    });

    it('returns empty for a query with no searchable tokens', () => {
      expect(h.svc.search({ q: '!!' }).total).toBe(0);
    });
  });

  describe('backfill', () => {
    it('indexes pre-existing data across every domain on boot', () => {
      const h = makeHarness({
        tasks: [task('t1', 'alpha task')],
        projects: [{ id: 'p1', name: 'alpha project' } as Project],
        memories: [{ id: 'm1', title: 'alpha memory', content: '' } as Memory],
        notes: [{ id: 'n1', content: 'alpha note' } as Note],
        councils: [{ id: 'c1', name: 'alpha council' } as Council],
        workflows: [{ id: 'w1', name: 'alpha workflow' } as WorkflowSummary],
      });
      h.svc.onApplicationBootstrap();
      const res = h.svc.search({ q: 'alpha', limit: 50 });
      expect(res.total).toBe(6);
      expect(Object.keys(res.byType).sort()).toEqual(
        ['council', 'memory', 'note', 'project', 'task', 'workflow'],
      );
    });
  });

  describe('task-bus sync', () => {
    let h: Harness;
    beforeEach(() => {
      h = makeHarness();
      h.svc.onApplicationBootstrap();
    });

    it('indexes a task on task.created and removes it on task.deleted', () => {
      h.bus.emit({ type: 'task.created', at: 'now', task: task('t1', 'streaming uploads') });
      expect(h.svc.search({ q: 'streaming' }).total).toBe(1);

      h.bus.emit({ type: 'task.deleted', at: 'now', id: 't1' });
      expect(h.svc.search({ q: 'streaming' }).total).toBe(0);
    });

    it('fetches and indexes a coalesced bulk-create batch', () => {
      h.fx.tasks.push(task('b1', 'bulk widget one'), task('b2', 'bulk widget two'));
      h.bus.emit({ type: 'tasks.bulkCreated', at: 'now', taskIds: ['b1', 'b2'] });
      expect(h.svc.search({ q: 'widget' }).total).toBe(2);
    });

    it('still indexes the rest of a bulk batch when one id has vanished', () => {
      h.fx.tasks.push(task('b1', 'bulk gadget one'));
      // 'gone' was deleted between emit and handling — must not drop the batch.
      h.bus.emit({ type: 'tasks.bulkCreated', at: 'now', taskIds: ['b1', 'gone'] });
      expect(h.svc.search({ q: 'gadget' }).total).toBe(1);
    });

    it('stops maintaining the index after destroy', () => {
      h.svc.onModuleDestroy();
      h.bus.emit({ type: 'task.created', at: 'now', task: task('t9', 'orphan') });
      expect(h.svc.search({ q: 'orphan' }).total).toBe(0);
    });
  });

  describe('reindex', () => {
    it('rebuilds the index from the domain services', () => {
      const h = makeHarness({ tasks: [task('t1', 'rebuildable')] });
      expect(h.svc.search({ q: 'rebuildable' }).total).toBe(0); // not yet indexed
      const n = h.svc.reindex();
      expect(n).toBe(1);
      expect(h.svc.search({ q: 'rebuildable' }).total).toBe(1);
    });
  });
});
