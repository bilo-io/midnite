import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type GuardrailsUpdatedEvent, type MidniteConfig, type Task } from '@midnite/shared';
import type { ApprovalsService } from '../approvals/approvals.service';
import type { TaskEventBus } from '../tasks/task-event-bus';
import type { TasksService } from '../tasks/tasks.service';
import { AgentPoolService } from './agent-pool.service';
import type { AgentRunnerService } from './agent-runner.service';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';

function config(pool: number): MidniteConfig {
  return parseConfig({ agent: { pool, poolEnabled: true }, terminal: {}, knowledge: {}, gateway: {} });
}

// The bus subscription in onModuleInit runs *before* the poolEnabled early-return,
// so a disabled-pool config lets us test the emergency-abort handler without
// starting a live tick timer.
function configNoPool(pool: number): MidniteConfig {
  return parseConfig({ agent: { pool, poolEnabled: false }, terminal: {}, knowledge: {}, gateway: {} });
}

function fakeTasks(todo: Array<{ id: string; repo?: string; teamId?: string }>) {
  const byId = new Map(todo.map((t) => [t.id, t]));
  const status = new Map(todo.map((t) => [t.id, 'todo']));
  const view = (id: string): Task =>
    ({ id, title: id, status: status.get(id), repo: byId.get(id)?.repo, teamId: byId.get(id)?.teamId }) as unknown as Task;
  return {
    listTasks: () => [...status.keys()].map(view),
    listReadyTodoTasks: () => [...status.keys()].filter((id) => status.get(id) === 'todo').map(view),
    getTask: (id: string) => view(id),
    requeue: (id: string) => status.set(id, 'todo'),
    _markStarted: (id: string) => status.set(id, 'wip'),
  } as unknown as TasksService & { _markStarted: (id: string) => void };
}

function fakeRunner(pool: AgentPoolService, tasks: { _markStarted: (id: string) => void }) {
  return {
    start: vi.fn(async (task: Task) => {
      if (pool.acquire(task.id) === null) return false;
      tasks._markStarted(task.id);
      return true;
    }),
    stop: vi.fn(),
  } as unknown as AgentRunnerService;
}

const approvals = (over: Partial<ApprovalsService> = {}) =>
  ({ isGloballyPaused: () => false, isTaskPaused: () => false, ...over }) as unknown as ApprovalsService;

const started = (runner: AgentRunnerService): string[] =>
  (runner.start as unknown as { mock: { calls: [Task][] } }).mock.calls.map((c) => c[0].id);

describe('AgentPoolScheduler — guardrail pause gate', () => {
  it('spawns nothing while globally paused', async () => {
    const cfg = config(2);
    const tasks = fakeTasks([{ id: 't1' }, { id: 't2' }]);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    const scheduler = new AgentPoolScheduler(cfg, tasks, pool, runner, undefined, approvals({ isGloballyPaused: () => true }));

    await scheduler.tick();

    expect(runner.start).not.toHaveBeenCalled();
    expect(pool.freeSlotCount()).toBe(2);
  });

  it('skips a task whose scope is paused but starts the rest', async () => {
    const cfg = config(2);
    const tasks = fakeTasks([{ id: 'held', repo: 'acme/api' }, { id: 'ok', repo: 'acme/web' }]);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    const scheduler = new AgentPoolScheduler(
      cfg,
      tasks,
      pool,
      runner,
      undefined,
      approvals({ isTaskPaused: (t: { repo?: string | null }) => t.repo === 'acme/api' }),
    );

    await scheduler.tick();

    expect(started(runner)).toEqual(['ok']);
  });

  it('aborts in-flight agents in scope on an emergency-stop event (requeued to todo)', () => {
    const cfg = configNoPool(2);
    const tasks = fakeTasks([{ id: 'a', repo: 'acme/api' }, { id: 'b', repo: 'acme/web' }]);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    // Both tasks are running.
    pool.acquire('a');
    pool.acquire('b');

    let listener: ((e: GuardrailsUpdatedEvent) => void) | undefined;
    const bus = {
      subscribe: (fn: (e: GuardrailsUpdatedEvent) => void) => {
        listener = fn;
        return () => undefined;
      },
    } as unknown as TaskEventBus;

    const scheduler = new AgentPoolScheduler(cfg, tasks, pool, runner, undefined, approvals(), bus);
    scheduler.onModuleInit();

    // Emergency stop scoped to acme/api → only task `a` is aborted.
    listener?.({
      type: 'guardrails.updated',
      at: 'now',
      guardrails: { pausedGlobal: false, pausedRepos: ['acme/api'], pausedTeams: [], pausedBy: 'u1', pausedAt: 'now' },
      emergencyStop: true,
      scope: { kind: 'repo', id: 'acme/api' },
    });

    expect(runner.stop).toHaveBeenCalledWith('a', 'todo');
    expect(runner.stop).toHaveBeenCalledTimes(1);
  });

  it('ignores a non-emergency guardrails update (soft pause leaves running agents)', () => {
    const cfg = configNoPool(2);
    const tasks = fakeTasks([{ id: 'a' }]);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    pool.acquire('a');

    let listener: ((e: GuardrailsUpdatedEvent) => void) | undefined;
    const bus = { subscribe: (fn: (e: GuardrailsUpdatedEvent) => void) => ((listener = fn), () => undefined) } as unknown as TaskEventBus;
    const scheduler = new AgentPoolScheduler(cfg, tasks, pool, runner, undefined, approvals(), bus);
    scheduler.onModuleInit();

    listener?.({
      type: 'guardrails.updated',
      at: 'now',
      guardrails: { pausedGlobal: true, pausedRepos: [], pausedTeams: [], pausedBy: 'u1', pausedAt: 'now' },
    });

    expect(runner.stop).not.toHaveBeenCalled();
  });
});
