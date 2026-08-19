import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task } from '@midnite/shared';
import type { ApprovalsService } from '../approvals/approvals.service';
import type { TasksService } from '../tasks/tasks.service';
import { AgentPoolService } from './agent-pool.service';
import type { AgentRunnerService } from './agent-runner.service';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';

// Phase 19 follow-up — `agent.poolEnabled` used to be read once in
// onModuleInit, so turning autonomy on meant hand-editing midnite.json *and*
// restarting the gateway. `PUT /setup/agent-pool` toggles it live via
// applyPoolEnabled(); these specs pin the start/stop seam.

function config(poolEnabled: boolean): MidniteConfig {
  return parseConfig({
    agent: { pool: 2, poolEnabled, schedulerTickMs: 1000 },
    terminal: {},
    knowledge: {},
    gateway: {},
  });
}

function fakeTasks() {
  return {
    listTasks: () => [],
    listReadyTodoTasks: () => [],
    getTask: (id: string) => ({ id }) as unknown as Task,
    requeue: vi.fn(),
  } as unknown as TasksService;
}

const approvals = () =>
  ({ isGloballyPaused: () => false, isTaskPaused: () => false }) as unknown as ApprovalsService;

function makeScheduler(poolEnabled: boolean) {
  const cfg = config(poolEnabled);
  const tasks = fakeTasks();
  const pool = new AgentPoolService(cfg, tasks);
  const runner = { start: vi.fn(), stop: vi.fn() } as unknown as AgentRunnerService;
  const scheduler = new AgentPoolScheduler(cfg, tasks, pool, runner, undefined, approvals());
  return { scheduler, cfg };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AgentPoolScheduler.applyPoolEnabled', () => {
  it('does not start a tick loop when the pool boots disabled', () => {
    const { scheduler } = makeScheduler(false);
    scheduler.onModuleInit();
    expect(scheduler.isRunning()).toBe(false);
    scheduler.onModuleDestroy();
  });

  it('starts the tick loop when autonomy is turned on at runtime', () => {
    // The fix for the headline first-run trap: no restart required.
    const { scheduler } = makeScheduler(false);
    scheduler.onModuleInit();
    expect(scheduler.isRunning()).toBe(false);

    scheduler.applyPoolEnabled(true);
    expect(scheduler.isRunning()).toBe(true);
    scheduler.onModuleDestroy();
  });

  it('stops the tick loop when autonomy is turned off at runtime', () => {
    const { scheduler } = makeScheduler(true);
    scheduler.onModuleInit();
    expect(scheduler.isRunning()).toBe(true);

    scheduler.applyPoolEnabled(false);
    expect(scheduler.isRunning()).toBe(false);
    scheduler.onModuleDestroy();
  });

  it('is idempotent — enabling twice keeps exactly one tick loop', () => {
    // Two intervals would double every tick and race the slot claim, which the
    // "single scheduler" invariant exists to prevent.
    const { scheduler } = makeScheduler(false);
    scheduler.onModuleInit();

    const spy = vi.spyOn(scheduler, 'tick').mockResolvedValue(undefined);
    scheduler.applyPoolEnabled(true);
    scheduler.applyPoolEnabled(true);

    vi.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(1);
    scheduler.onModuleDestroy();
  });

  it('survives a disable while already disabled', () => {
    const { scheduler } = makeScheduler(false);
    scheduler.onModuleInit();
    expect(() => scheduler.applyPoolEnabled(false)).not.toThrow();
    expect(scheduler.isRunning()).toBe(false);
    scheduler.onModuleDestroy();
  });

  it('can be toggled off and back on', () => {
    const { scheduler } = makeScheduler(true);
    scheduler.onModuleInit();

    scheduler.applyPoolEnabled(false);
    expect(scheduler.isRunning()).toBe(false);
    scheduler.applyPoolEnabled(true);
    expect(scheduler.isRunning()).toBe(true);

    scheduler.onModuleDestroy();
  });
});
