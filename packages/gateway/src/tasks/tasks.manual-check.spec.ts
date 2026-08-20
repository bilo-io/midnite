import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type CheckRun } from '@midnite/shared';
import type { PlannerService } from '../agent/planner.service';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import type { ChecksService } from '../checks/checks.service';
import type { CwdResolverService } from '../cwd/cwd-resolver.service';
import type { ReposService } from '../repos/repos.service';
import { createTestDb, type TestDbHandle } from '../test/db';
import { TasksRepository } from './tasks.repository';
import { TaskFailuresRepository } from './task-failures.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';

// Phase 84 Theme D — a manual check (`POST /tasks/:id/check`) used to expand
// `repo.path` itself, ignoring the task's project entirely, so it could validate
// a tree the agent had never worked in. It now goes through the one resolver;
// these pin that, and that the no-op branches still short-circuit.

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

const configWithChecks = parseConfig({
  agent: {},
  terminal: {},
  gateway: {},
  checks: { enabled: true, gates: [{ name: 'test', command: 'pnpm test' }] },
});

describe('TasksService.runManualCheck — cwd comes from the shared resolver', () => {
  let handle: TestDbHandle;
  let repo: TasksRepository;
  let run: ReturnType<typeof vi.fn>;
  let resolveForTask: ReturnType<typeof vi.fn>;

  const passingRun = (cwd: string): CheckRun => ({
    id: 'run-1',
    taskId: 't1',
    trigger: 'manual',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    passed: true,
    // The cwd is echoed back through the stub so the assertion reads off a real
    // argument rather than a call-count.
    results: [{ name: cwd, command: 'pnpm test', passed: true, exitCode: 0, durationMs: 1, output: '' }],
  });

  function build(opts: { withResolver: boolean }) {
    run = vi.fn(async (_taskId: string, _checks: unknown, cwd: string) => passingRun(cwd));
    resolveForTask = vi.fn(() => '/resolved/by/the/resolver');
    return new TasksService(
      repo,
      new TaskFailuresRepository(handle.db),
      new StubClassifier(),
      stubPlanner,
      new TaskEventBus(),
      { findByName: () => ({ name: 'gateway', path: '/repo/path' }), list: () => [] } as unknown as ReposService,
      configWithChecks,
      { run } as unknown as ChecksService,
      undefined,
      undefined,
      opts.withResolver ? ({ resolveForTask } as unknown as CwdResolverService) : undefined,
    );
  }

  beforeEach(() => {
    handle = createTestDb();
    repo = new TasksRepository(handle.db);
  });
  afterEach(() => handle.close());

  async function seedTask(service: TasksService) {
    const task = await service.createFromPrompt({
      prompt: 'ship the thing',
      images: [],
      repo: 'gateway',
    });
    return task.id;
  }

  it('runs the checks in the resolver’s directory, not the raw repo path', async () => {
    const service = build({ withResolver: true });
    const id = await seedTask(service);

    const result = await service.runManualCheck(id);

    expect(resolveForTask).toHaveBeenCalledWith(expect.objectContaining({ id, repo: 'gateway' }));
    expect(run).toHaveBeenCalledWith(id, expect.anything(), '/resolved/by/the/resolver', 'manual');
    expect(result.results[0]?.name).toBe('/resolved/by/the/resolver');
  });

  it('falls back to the repo path only when no resolver is wired (hand-built specs)', async () => {
    const service = build({ withResolver: false });
    const id = await seedTask(service);

    await service.runManualCheck(id);

    expect(run).toHaveBeenCalledWith(id, expect.anything(), '/repo/path', 'manual');
  });

  it('short-circuits to a synthetic passed run when the task has no repo', async () => {
    const service = build({ withResolver: true });
    const task = await service.createFromPrompt({ prompt: 'no repo here', images: [] });

    const result = await service.runManualCheck(task.id);

    expect(result.passed).toBe(true);
    expect(result.results).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });
});
