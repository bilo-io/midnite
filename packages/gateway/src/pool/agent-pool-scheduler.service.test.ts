import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task } from '@midnite/shared';
import type { TasksService } from '../tasks/tasks.service';
import { AgentPoolService } from './agent-pool.service';
import type { AgentRunnerService } from './agent-runner.service';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';

function config(pool: number): MidniteConfig {
  return parseConfig({ agent: { pool, poolEnabled: true }, terminal: {}, knowledge: {}, gateway: {} });
}

// A mutable task list whose `todo` view shrinks as the runner starts tasks.
function fakeTasks(todoIds: string[]) {
  let status = new Map(todoIds.map((id) => [id, 'todo']));
  const service = {
    listTasks: (s?: string) =>
      [...status.entries()]
        .filter(([, st]) => !s || st === s)
        .map(([id]) => ({ id, title: id, status: status.get(id) }) as unknown as Task),
    requeue: (id: string) => status.set(id, 'todo'),
  } as unknown as TasksService;
  const markStarted = (id: string) => status.set(id, 'wip');
  return { service, markStarted };
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
