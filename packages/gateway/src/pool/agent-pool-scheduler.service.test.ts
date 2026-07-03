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

// A mutable task list whose `todo`/ready views shrink as the runner starts tasks.
// Items may be a bare id, `{ id, repo }` (per-repo cap) or `{ id, dependsOn }`
// (dependency ready-gating). A task is *ready* when it's `todo` and every blocker
// is `done` — mirroring the repository's `listReadyTodoTasks` SQL.
function fakeTasks(todo: Array<string | { id: string; repo?: string; dependsOn?: string[] }>) {
  const specs = todo.map((t) => (typeof t === 'string' ? { id: t } : t));
  const status = new Map(specs.map((s) => [s.id, 'todo']));
  const repos = new Map(specs.map((s) => [s.id, s.repo]));
  const deps = new Map(specs.map((s) => [s.id, s.dependsOn ?? []]));
  const view = (id: string) =>
    ({ id, title: id, status: status.get(id), repo: repos.get(id) }) as unknown as Task;
  const isReady = (id: string) => (deps.get(id) ?? []).every((d) => status.get(d) === 'done');
  const service = {
    listTasks: (s?: string) => [...status.keys()].filter((id) => !s || status.get(id) === s).map(view),
    listReadyTodoTasks: () =>
      [...status.keys()].filter((id) => status.get(id) === 'todo' && isReady(id)).map(view),
    requeue: (id: string) => status.set(id, 'todo'),
  } as unknown as TasksService;
  const markStarted = (id: string) => status.set(id, 'wip');
  const markDone = (id: string) => status.set(id, 'done');
  return { service, markStarted, markDone };
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

  it('only starts ready tasks — a blocked task waits until its blocker is done', async () => {
    const cfg = config(4); // ample slots, so only readiness gates starting
    const { service, markStarted, markDone } = fakeTasks([
      { id: 't1' },
      { id: 't2', dependsOn: ['t1'] },
    ]);
    const pool = new AgentPoolService(cfg, service);
    const runner = fakeRunner(pool, markStarted);
    const scheduler = new AgentPoolScheduler(cfg, service, pool, runner);

    await scheduler.tick();
    // t2 is blocked by the not-yet-done t1, so it's excluded from the ready set
    // even with free slots — only t1 starts.
    expect(startedIds(runner)).toEqual(['t1']);

    // Completing t1 releases t2 on the next tick (readiness is re-evaluated).
    pool.release('t1');
    markDone('t1');
    await scheduler.tick();
    expect(startedIds(runner)).toEqual(['t1', 't2']);
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

  // --- Phase 54 D: scheduler resilience ---

  type Health = { dbReachable: () => boolean };
  function schedulerWithHealth(
    cfg: MidniteConfig,
    service: TasksService,
    pool: AgentPoolService,
    runner: AgentRunnerService,
    health?: Health,
  ): AgentPoolScheduler {
    // health is the 12th (last) constructor param, after the optional deps.
    return new AgentPoolScheduler(
      cfg, service, pool, runner,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      health as never,
    );
  }

  it('pause() stops new work without tearing down; resume() restores it (Phase 54 D)', async () => {
    const cfg = config(4);
    const { service, markStarted } = fakeTasks(['t1', 't2']);
    const pool = new AgentPoolService(cfg, service);
    const runner = fakeRunner(pool, markStarted);
    const scheduler = new AgentPoolScheduler(cfg, service, pool, runner);

    scheduler.pause();
    expect(scheduler.isPaused()).toBe(true);
    await scheduler.tick();
    expect(runner.start).not.toHaveBeenCalled(); // paused → no spawns

    scheduler.resume();
    expect(scheduler.isPaused()).toBe(false);
    await scheduler.tick();
    expect(startedIds(runner).sort()).toEqual(['t1', 't2']);
  });

  it('readiness gate skips + backs off when the DB is unreachable, then recovers (Phase 54 D)', async () => {
    vi.useFakeTimers();
    try {
      const cfg = parseConfig({
        agent: { pool: 4, poolEnabled: true, readinessBackoff: { baseMs: 1000, maxMs: 30000 } },
        terminal: {},
        gateway: {},
      });
      const { service, markStarted } = fakeTasks(['t1']);
      const pool = new AgentPoolService(cfg, service);
      const runner = fakeRunner(pool, markStarted);
      let dbUp = false;
      const scheduler = schedulerWithHealth(cfg, service, pool, runner, { dbReachable: () => dbUp });

      // DB down → tick schedules nothing and enters backoff.
      await scheduler.tick();
      expect(runner.start).not.toHaveBeenCalled();
      expect(scheduler.isBackingOff()).toBe(true);

      // Still within the backoff window → skipped entirely (no re-probe yet).
      dbUp = true;
      await vi.advanceTimersByTimeAsync(500);
      await scheduler.tick();
      expect(runner.start).not.toHaveBeenCalled();

      // Window elapsed → re-probe succeeds → scheduling resumes.
      await vi.advanceTimersByTimeAsync(600);
      await scheduler.tick();
      expect(scheduler.isBackingOff()).toBe(false);
      expect(startedIds(runner)).toEqual(['t1']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('readiness backoff window grows on each consecutive failure (Phase 54 D)', async () => {
    vi.useFakeTimers();
    try {
      const cfg = parseConfig({
        agent: { pool: 1, poolEnabled: true, readinessBackoff: { baseMs: 1000, maxMs: 30000 } },
        terminal: {},
        gateway: {},
      });
      const { service, markStarted } = fakeTasks(['t1']);
      const pool = new AgentPoolService(cfg, service);
      const runner = fakeRunner(pool, markStarted);
      const scheduler = schedulerWithHealth(cfg, service, pool, runner, { dbReachable: () => false });

      // 1st failure → ~1000ms window: cleared after 1100ms.
      await scheduler.tick();
      await vi.advanceTimersByTimeAsync(1100);
      expect(scheduler.isBackingOff()).toBe(false);

      // 2nd consecutive failure → ~2000ms window: still backing off at +1100, not at +2100.
      await scheduler.tick();
      await vi.advanceTimersByTimeAsync(1100);
      expect(scheduler.isBackingOff()).toBe(true);
      await vi.advanceTimersByTimeAsync(1000);
      expect(scheduler.isBackingOff()).toBe(false);

      expect(runner.start).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
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
