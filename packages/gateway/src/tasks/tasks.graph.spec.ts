import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseConfig, type Status } from '@midnite/shared';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import type { PlannerService } from '../agent/planner.service';
import type { ReposService } from '../repos/repos.service';
import { createTestDb, type TestDbHandle } from '../test/db';
import { TasksRepository } from './tasks.repository';
import { TaskFailuresRepository } from './task-failures.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';

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

describe('TasksService.buildGraph (Phase 58 A)', () => {
  let handle: TestDbHandle;
  let service: TasksService;

  beforeEach(() => {
    handle = createTestDb();
    const repo = new TasksRepository(handle.db);
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

  const make = (prompt: string) => service.createFromPrompt({ prompt, images: [] });
  const setStatus = (id: string, status: Status) => service.updateStatus(id, status);

  it('returns a node per task and an edge per blocker (from dependent → blocker)', async () => {
    const blocker = await make('build the api');
    const dependent = await make('build the client');
    service.addDependency(dependent.id, blocker.id);

    const graph = service.buildGraph(undefined);
    expect(graph.nodes.map((n) => n.id).sort()).toEqual([blocker.id, dependent.id].sort());
    expect(graph.edges).toEqual([{ from: dependent.id, to: blocker.id }]);
    expect(graph.truncated).toBe(false);
    expect(graph.totalCount).toBe(2);
  });

  it('computes ready + unmetBlockerCount with the scheduler’s definition', async () => {
    const blocker = await make('blocker');
    const dependent = await make('dependent');
    service.addDependency(dependent.id, blocker.id);

    // Blocker still open → dependent has 1 unmet blocker, not ready.
    let dep = service.buildGraph(undefined).nodes.find((n) => n.id === dependent.id)!;
    expect(dep.unmetBlockerCount).toBe(1);
    expect(dep.ready).toBe(false);

    // Blocker done → dependent is ready (it's a todo with all blockers done).
    setStatus(blocker.id, 'done');
    dep = service.buildGraph(undefined).nodes.find((n) => n.id === dependent.id)!;
    expect(dep.unmetBlockerCount).toBe(0);
    expect(dep.ready).toBe(true);
  });

  it('ready is false for a non-todo task even with no unmet blockers', async () => {
    const t = await make('in progress');
    setStatus(t.id, 'wip');
    const node = service.buildGraph(undefined).nodes.find((n) => n.id === t.id)!;
    expect(node.unmetBlockerCount).toBe(0);
    expect(node.ready).toBe(false);
  });

  it('pulls a cross-project blocker in as a foreign node under ?projectId', async () => {
    // Tasks in different projects, with a cross-project dependency.
    const blocker = await service.createFromPrompt({ prompt: 'shared infra', images: [], projectId: 'proj-B' });
    const dependent = await service.createFromPrompt({
      prompt: 'feature needing infra',
      images: [],
      projectId: 'proj-A',
    });
    service.addDependency(dependent.id, blocker.id);

    const graph = service.buildGraph('proj-A');
    const ids = graph.nodes.map((n) => n.id).sort();
    expect(ids).toEqual([blocker.id, dependent.id].sort());
    expect(graph.nodes.find((n) => n.id === blocker.id)?.foreign).toBe(true);
    expect(graph.nodes.find((n) => n.id === dependent.id)?.foreign).toBeUndefined();
    expect(graph.edges).toEqual([{ from: dependent.id, to: blocker.id }]);
    // Only the in-scope project task counts toward totalCount.
    expect(graph.totalCount).toBe(1);
  });

  it('filters to a milestone, surfacing an out-of-milestone blocker as foreign (Phase 58 F)', async () => {
    const blocker = await make('build the api');
    const dependent = await make('build the client');
    service.addDependency(dependent.id, blocker.id);
    // Only the dependent is in the milestone.
    service.setMilestone(dependent.id, 'ms-1');

    const graph = service.buildGraph(undefined, undefined, 'ms-1');
    expect(graph.totalCount).toBe(1);
    expect(graph.nodes.map((n) => n.id).sort()).toEqual([blocker.id, dependent.id].sort());
    // The blocker is out of the milestone → included only as a foreign context node.
    expect(graph.nodes.find((n) => n.id === blocker.id)?.foreign).toBe(true);
    expect(graph.nodes.find((n) => n.id === dependent.id)?.foreign).toBeUndefined();
    expect(graph.edges).toEqual([{ from: dependent.id, to: blocker.id }]);
  });
});
