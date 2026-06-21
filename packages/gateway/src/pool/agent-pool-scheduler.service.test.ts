import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task } from '@midnite/shared';
import type { TasksService } from '../tasks/tasks.service';
import { AgentPoolService } from './agent-pool.service';
import type { AgentRunnerService } from './agent-runner.service';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';

function config(pool: number, maxPerRepo = 0): MidniteConfig {
  return parseConfig({
    agent: { pool, poolEnabled: true, maxPerRepo },
    terminal: {},
    knowledge: {},
    gateway: {},
  });
}

// A mutable task list whose `todo` view shrinks as the runner starts tasks.
// Items may be a bare id or `{ id, repo }` to exercise the per-repo cap.
function fakeTasks(todo: Array<string | { id: string; repo?: string }>) {
  const specs = todo.map((t) => (typeof t === 'string' ? { id: t } : t));
  const status = new Map(specs.map((s) => [s.id, 'todo']));
  const repos = new Map(specs.map((s) => [s.id, s.repo]));
  const service = {
    listTasks: (s?: string) =>
      [...status.entries()]
        .filter(([, st]) => !s || st === s)
        .map(([id]) => ({ id, title: id, status: status.get(id), repo: repos.get(id) }) as unknown as Task),
    requeue: (id: string) => status.set(id, 'todo'),
  } as unknown as TasksService;
  const markStarted = (id: string) => status.set(id, 'wip');
  return { service, markStarted };
}

// Build a runner that claims a slot + marks the task wip on start (the real
// runner.start's observable effect for the scheduler), recording call order.
function fakeRunner(pool: AgentPoolService, markStarted: (id: string) => void) {
  return {
    start: vi.fn(async (task: Task) => {
      if (pool.acquire(task.id) === null) return false;
      markStarted(task.id);
      return true;
    }),
  } as unknown as AgentRunnerService;
}

function startedIds(runner: AgentRunnerService): string[] {
  return (runner.start as unknown as { mock: { calls: [Task][] } }).mock.calls.map((c) => c[0].id);
}

describe('AgentPoolScheduler.tick', () => {
  it('fills every free slot from the oldest todo tasks, then stops', async () => {
    const cfg = config(2);
    const { service, markStarted } = fakeTasks(['t1', 't2', 't3']);
    const pool = new AgentPoolService(cfg, service);

    const runner = {
      start: vi.fn(async (task: Task) => {
        if (pool.acquire(task.id) === null) return false;
        markStarted(task.id);
        return true;
      }),
    } as unknown as AgentRunnerService;

    const scheduler = new AgentPoolScheduler(cfg, service, pool, runner);
    await scheduler.tick();

    expect(runner.start).toHaveBeenCalledTimes(2);
    expect(pool.freeSlotCount()).toBe(0);

    // Free a slot and tick again — the third task gets picked up.
    pool.release('t1');
    await scheduler.tick();
    expect(runner.start).toHaveBeenCalledTimes(3);
  });

  it('does nothing when there are no todo tasks', async () => {
    const cfg = config(4);
    const { service } = fakeTasks([]);
    const pool = new AgentPoolService(cfg, service);
    const runner = { start: vi.fn(async () => true) } as unknown as AgentRunnerService;
    const scheduler = new AgentPoolScheduler(cfg, service, pool, runner);

    await scheduler.tick();
    expect(runner.start).not.toHaveBeenCalled();
  });

  it('caps concurrent agents per repo and resumes when a slot frees', async () => {
    const cfg = config(4, 1); // 4 slots, but at most 1 agent per repo
    const { service, markStarted } = fakeTasks([
      { id: 't1', repo: 'acme/api' },
      { id: 't2', repo: 'acme/api' },
      { id: 't3', repo: 'acme/web' },
    ]);
    const pool = new AgentPoolService(cfg, service);
    const runner = fakeRunner(pool, markStarted);
    const scheduler = new AgentPoolScheduler(cfg, service, pool, runner);

    await scheduler.tick();
    // t1 (acme/api) and t3 (acme/web) start; t2 is skipped — acme/api at cap —
    // even though slots remain free.
    expect(startedIds(runner)).toEqual(['t1', 't3']);
    expect(pool.busyTaskIds().sort()).toEqual(['t1', 't3']);

    // Finishing t1 frees the acme/api repo → t2 runs on the next tick.
    pool.release('t1');
    await scheduler.tick();
    expect(startedIds(runner)).toEqual(['t1', 't3', 't2']);
  });

  it('does not cap when maxPerRepo is 0 (unlimited)', async () => {
    const cfg = config(3, 0);
    const { service, markStarted } = fakeTasks([
      { id: 't1', repo: 'acme/api' },
      { id: 't2', repo: 'acme/api' },
      { id: 't3', repo: 'acme/api' },
    ]);
    const pool = new AgentPoolService(cfg, service);
    const runner = fakeRunner(pool, markStarted);

    await new AgentPoolScheduler(cfg, service, pool, runner).tick();
    expect(runner.start).toHaveBeenCalledTimes(3); // all three, same repo
  });

  it('never caps tasks that have no repo', async () => {
    const cfg = config(3, 1);
    const { service, markStarted } = fakeTasks(['t1', 't2', 't3']); // repo-less
    const pool = new AgentPoolService(cfg, service);
    const runner = fakeRunner(pool, markStarted);

    await new AgentPoolScheduler(cfg, service, pool, runner).tick();
    expect(runner.start).toHaveBeenCalledTimes(3);
  });

  it('guards against re-entrant ticks', async () => {
    const cfg = config(4);
    const { service, markStarted } = fakeTasks(['t1', 't2']);
    const pool = new AgentPoolService(cfg, service);

    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const runner = {
      start: vi.fn(async (task: Task) => {
        await gate; // hold the first tick open
        pool.acquire(task.id);
        markStarted(task.id);
        return true;
      }),
    } as unknown as AgentRunnerService;

    const scheduler = new AgentPoolScheduler(cfg, service, pool, runner);
    const first = scheduler.tick();
    await scheduler.tick(); // should early-return while the first is in flight
    expect(runner.start).toHaveBeenCalledTimes(1);

    release();
    await first;
  });
});
