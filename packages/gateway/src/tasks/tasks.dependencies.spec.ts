import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TaskDependencyError, parseConfig, type Status } from '@midnite/shared';
const stubConfig = parseConfig({ agent: {}, terminal: {}, gateway: {} });
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import type { PlannerService } from '../agent/planner.service';
import type { ReposService } from '../repos/repos.service';
import { createTestDb, type TestDbHandle } from '../test/db';
import { TasksRepository } from './tasks.repository';
import { TaskFailuresRepository } from './task-failures.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';

// Title = prompt prefix, no AI. Triage always ready (→ todo) so created tasks
// land where the scheduler would see them.
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

describe('Task dependencies (Phase 27 Theme A)', () => {
  let handle: TestDbHandle;
  let repo: TasksRepository;
  let service: TasksService;

  beforeEach(() => {
    handle = createTestDb();
    repo = new TasksRepository(handle.db);
    service = new TasksService(repo, new TaskFailuresRepository(handle.db), new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
  });

  afterEach(() => handle.close());

  const make = (prompt: string) => service.createFromPrompt({ prompt, images: [] });
  const setStatus = (id: string, status: Status) => service.updateStatus(id, status);

  it('adds an edge and surfaces it as the dependent task’s dependsOn', async () => {
    const a = await make('build the api');
    const b = await make('build the client');
    const updated = service.addDependency(b.id, a.id);
    expect(updated.dependsOn).toEqual([a.id]);
    expect(service.getTask(b.id).dependsOn).toEqual([a.id]);
  });

  it('rejects a self-reference (400-class)', async () => {
    const a = await make('lonely task');
    expect(() => service.addDependency(a.id, a.id)).toThrow(TaskDependencyError);
    try {
      service.addDependency(a.id, a.id);
    } catch (err) {
      expect((err as TaskDependencyError).reason).toBe('self-reference');
    }
  });

  it('rejects a non-existent blocker', async () => {
    const a = await make('real task');
    try {
      service.addDependency(a.id, 'ghost');
      throw new Error('expected throw');
    } catch (err) {
      expect((err as TaskDependencyError).reason).toBe('unknown-task');
    }
  });

  it('rejects an edge that would close a cycle', async () => {
    const a = await make('A');
    const b = await make('B');
    const c = await make('C');
    service.addDependency(b.id, a.id); // B depends on A
    service.addDependency(c.id, b.id); // C depends on B
    // A depends on C would close A → C → B → A.
    try {
      service.addDependency(a.id, c.id);
      throw new Error('expected cycle rejection');
    } catch (err) {
      expect((err as TaskDependencyError).reason).toBe('cycle');
    }
  });

  it('allows a diamond (shared blocker, no cycle)', async () => {
    const a = await make('A');
    const b = await make('B');
    const c = await make('C');
    const d = await make('D');
    service.addDependency(b.id, a.id);
    service.addDependency(c.id, a.id);
    expect(() => service.addDependency(d.id, b.id)).not.toThrow();
    expect(() => service.addDependency(d.id, c.id)).not.toThrow();
  });

  it('removeDependency drops the edge (idempotent)', async () => {
    const a = await make('A');
    const b = await make('B');
    service.addDependency(b.id, a.id);
    expect(service.removeDependency(b.id, a.id).dependsOn ?? []).toEqual([]);
    expect(() => service.removeDependency(b.id, a.id)).not.toThrow();
  });

  it('creates a task with dependsOn, validating each blocker exists', async () => {
    const a = await make('blocker');
    const t = await service.createFromPrompt({ prompt: 'dependent', dependsOn: [a.id], images: [] });
    expect(t.dependsOn).toEqual([a.id]);
    await expect(
      service.createFromPrompt({ prompt: 'bad', dependsOn: ['ghost'], images: [] }),
    ).rejects.toBeInstanceOf(TaskDependencyError);
  });

  it('deleting a task cleans up edges both ways and unblocks dependents', async () => {
    const a = await make('A');
    const b = await make('B');
    service.addDependency(b.id, a.id);
    // A must be archived before delete (service rule).
    setStatus(a.id, 'abandoned'); // archives it
    service.deleteTask(a.id);
    expect(() => service.getTask(a.id)).toThrow(NotFoundException);
    expect(service.getTask(b.id).dependsOn).toEqual([]); // edge gone → unblocked
    expect(repo.dependentsOf(a.id)).toEqual([]);
  });

  describe('ready-set query', () => {
    it('excludes a todo with a non-done blocker, includes it once the blocker is done', async () => {
      const a = await make('blocker');
      const b = await make('dependent');
      service.addDependency(b.id, a.id);
      // A is todo (not done) → B is not ready; A itself has no blocker → ready.
      expect(repo.listReadyTodoTasks().map((t) => t.id).sort()).toEqual([a.id].sort());
      setStatus(a.id, 'done');
      expect(repo.listReadyTodoTasks().map((t) => t.id)).toContain(b.id);
    });

    it('keeps priority-desc, age-asc ordering among ready tasks', async () => {
      const first = await make('older normal'); // priority 1 (default)
      const second = await service.createFromPrompt({ prompt: 'newer urgent', priority: 3, images: [] });
      const ready = repo.listReadyTodoTasks().map((t) => t.id);
      // Both ready (no blockers); urgent sorts ahead despite being created later.
      expect(ready[0]).toBe(second.id);
      expect(ready).toContain(first.id);
    });
  });
});
