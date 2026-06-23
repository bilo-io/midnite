import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Breakdown, Task } from '@midnite/shared';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import type { PlannerService } from '../agent/planner.service';
import type { ReposService } from '../repos/repos.service';
import { createTestDb, type TestDbHandle } from '../test/db';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';

// createTasksFromBreakdown is deterministic (no AI), but TasksService still needs
// its collaborators. Stubs keep it isolated; classify/triage are never reached.
class StubClassifier extends TaskClassifier {
  async classify(prompt: string, _images: ClassifierImage[]) {
    return { title: prompt.slice(0, 40), kind: 'feature' as const };
  }
}
const stubPlanner = {
  triage: async () => ({ ready: true }),
  answer: async () => null,
  guessRepo: async () => null,
} as unknown as PlannerService;
const stubRepos = { findByName: () => undefined, list: () => [] } as unknown as ReposService;

describe('TasksService.createTasksFromBreakdown (Phase 28 Theme B)', () => {
  let handle: TestDbHandle;
  let repo: TasksRepository;
  let bus: TaskEventBus;
  let service: TasksService;

  beforeEach(() => {
    handle = createTestDb();
    repo = new TasksRepository(handle.db);
    bus = new TaskEventBus();
    service = new TasksService(repo, new StubClassifier(), stubPlanner, bus, stubRepos);
  });

  afterEach(() => handle.close());

  /** Map title → its created Task, for asserting on the returned board. */
  const byTitle = (tasks: Task[]) => new Map(tasks.map((t) => [t.title, t]));

  it('creates a task per ref with explicit title/kind/priority, tagged to the project', () => {
    const breakdown: Breakdown = {
      tasks: [
        { ref: 'a', title: 'Build the API', kind: 'feature', priority: 2, dependsOn: [] },
        { ref: 'b', title: 'Write the docs', dependsOn: [] }, // kind/priority default
      ],
    };
    const tasks = service.createTasksFromBreakdown(breakdown, { projectId: 'proj-1' });
    const m = byTitle(tasks);
    expect(tasks).toHaveLength(2);
    expect(m.get('Build the API')).toMatchObject({ kind: 'feature', priority: 2, status: 'todo', projectId: 'proj-1' });
    expect(m.get('Write the docs')).toMatchObject({ kind: 'unknown', priority: 1, projectId: 'proj-1' });
  });

  it('wires a clear blocker edge and gates scheduling on it', () => {
    const breakdown: Breakdown = {
      tasks: [
        { ref: 'api', title: 'API', dependsOn: [] },
        { ref: 'client', title: 'Client', dependsOn: ['api'] }, // client blocked by api
      ],
    };
    const tasks = service.createTasksFromBreakdown(breakdown, {});
    const m = byTitle(tasks);
    const apiId = m.get('API')!.id;
    expect(m.get('Client')!.dependsOn).toEqual([apiId]);
    // Only the unblocked task is ready to schedule; the dependent is held.
    const ready = service.listReadyTodoTasks().map((t) => t.title);
    expect(ready).toContain('API');
    expect(ready).not.toContain('Client');
  });

  it('leaves independent tasks parallel (no edges)', () => {
    const tasks = service.createTasksFromBreakdown(
      { tasks: [{ ref: 'a', title: 'A', dependsOn: [] }, { ref: 'b', title: 'B', dependsOn: [] }] },
      {},
    );
    for (const t of tasks) expect(t.dependsOn).toEqual([]);
    expect(service.listReadyTodoTasks()).toHaveLength(2);
  });

  it('prunes an unknown dependsOn ref without failing', () => {
    const tasks = service.createTasksFromBreakdown(
      { tasks: [{ ref: 'a', title: 'A', dependsOn: ['ghost'] }] },
      {},
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.dependsOn).toEqual([]); // 'ghost' resolved to nothing → dropped
  });

  it('prunes a self-reference', () => {
    const tasks = service.createTasksFromBreakdown(
      { tasks: [{ ref: 'a', title: 'A', dependsOn: ['a'] }] },
      {},
    );
    expect(tasks[0]!.dependsOn).toEqual([]);
  });

  it('breaks a cycle by pruning the closing edge, not throwing', () => {
    // a → b and b → a: whichever edge is added first stands; the second would
    // close a cycle and is dropped. Exactly one edge survives; no throw.
    const tasks = service.createTasksFromBreakdown(
      { tasks: [
        { ref: 'a', title: 'A', dependsOn: ['b'] },
        { ref: 'b', title: 'B', dependsOn: ['a'] },
      ] },
      {},
    );
    const totalEdges = tasks.reduce((n, t) => n + (t.dependsOn?.length ?? 0), 0);
    expect(totalEdges).toBe(1);
    // The graph is acyclic → both tasks still exist and one is schedulable.
    expect(tasks).toHaveLength(2);
    expect(service.listReadyTodoTasks().length).toBeGreaterThanOrEqual(1);
  });

  it('de-dupes a repeated ref (first wins)', () => {
    const tasks = service.createTasksFromBreakdown(
      { tasks: [
        { ref: 'a', title: 'First', dependsOn: [] },
        { ref: 'a', title: 'Duplicate', dependsOn: [] },
      ] },
      {},
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.title).toBe('First');
  });

  it('emits exactly one coalesced tasks.bulkCreated event for the batch', () => {
    const spy = vi.spyOn(bus, 'emit');
    const tasks = service.createTasksFromBreakdown(
      { tasks: [{ ref: 'a', title: 'A', dependsOn: [] }, { ref: 'b', title: 'B', dependsOn: ['a'] }] },
      {},
    );
    const bulk = spy.mock.calls.map((c) => c[0]).filter((e) => e.type === 'tasks.bulkCreated');
    expect(bulk).toHaveLength(1);
    expect((bulk[0] as { taskIds: string[] }).taskIds).toEqual(tasks.map((t) => t.id));
  });

  it('returns an empty board for an empty breakdown without emitting', () => {
    const spy = vi.spyOn(bus, 'emit');
    expect(service.createTasksFromBreakdown({ tasks: [] }, {})).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
