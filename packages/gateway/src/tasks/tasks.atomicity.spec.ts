import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type Breakdown } from '@midnite/shared';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import type { PlannerService } from '../agent/planner.service';
import type { ReposService } from '../repos/repos.service';
import { createTestDb, type TestDbHandle } from '../test/db';
import { TasksRepository } from './tasks.repository';
import { TaskFailuresRepository } from './task-failures.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';

// Phase 60 E (TX-1/2) — the create paths must be atomic: a mid-write throw rolls
// the WHOLE sequence back rather than leaving an orphaned task row / partial
// dependency graph. These exercise a REAL SQLite transaction (createTestDb) and
// force a failure partway through, asserting nothing persists.

const stubConfig = parseConfig({ agent: {}, terminal: {}, gateway: {} });

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

describe('TasksService create-path atomicity (Phase 60 E)', () => {
  let handle: TestDbHandle;
  let repo: TasksRepository;
  let service: TasksService;

  beforeEach(() => {
    handle = createTestDb();
    repo = new TasksRepository(handle.db);
    service = new TasksService(
      repo,
      new TaskFailuresRepository(handle.db),
      new StubClassifier(),
      stubPlanner,
      new TaskEventBus(),
      stubRepos,
      stubConfig,
    );
  });

  afterEach(() => handle.close());

  it('createFromPrompt rolls the task row back when a later write throws', async () => {
    // The task.created event write fails → the whole transaction (incl. the task
    // row inserted just before it) must roll back.
    vi.spyOn(repo, 'insertEvent').mockImplementation(() => {
      throw new Error('boom: event write failed');
    });

    await expect(service.createFromPrompt({ prompt: 'ship the thing', images: [] })).rejects.toThrow(
      /boom/,
    );
    // No orphaned task row, no dependency/attachment residue.
    expect(service.listTasks()).toHaveLength(0);
  });

  it('createFromPrompt persists the task + created event when all writes succeed', async () => {
    const task = await service.createFromPrompt({ prompt: 'ship the thing', images: [] });
    expect(task.id).toBeTruthy();
    expect(service.listTasks()).toHaveLength(1);
    const full = service.getTask(task.id);
    expect(full.events.some((e) => e.kind === 'task.created')).toBe(true);
  });

  it('createTasksFromBreakdown rolls back the whole graph when a mid-batch write throws', () => {
    // Fail on the 2nd task's created event — the first task (already inserted in
    // the same txn) must roll back too: all-or-nothing, no half-wired graph.
    let calls = 0;
    vi.spyOn(repo, 'insertEvent').mockImplementation((() => {
      calls += 1;
      if (calls === 2) throw new Error('boom: second event failed');
    }) as never);

    const breakdown: Breakdown = {
      tasks: [
        { ref: 'a', title: 'First', dependsOn: [] },
        { ref: 'b', title: 'Second', dependsOn: ['a'] },
      ],
    } as Breakdown;

    expect(() => service.createTasksFromBreakdown(breakdown)).toThrow(/boom/);
    expect(service.listTasks()).toHaveLength(0);
  });

  it('createTasksFromBreakdown persists every task + edge atomically on success', () => {
    const breakdown: Breakdown = {
      tasks: [
        { ref: 'a', title: 'First', dependsOn: [] },
        { ref: 'b', title: 'Second', dependsOn: ['a'] },
      ],
    } as Breakdown;

    const created = service.createTasksFromBreakdown(breakdown);
    expect(created).toHaveLength(2);
    expect(service.listTasks()).toHaveLength(2);
    // the 'b' → 'a' edge landed (Second is blocked by First)
    const second = created.find((t) => t.title === 'Second')!;
    expect(service.getTask(second.id).dependsOn).toHaveLength(1);
  });
});
