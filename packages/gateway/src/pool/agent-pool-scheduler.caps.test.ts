import { describe, expect, it, vi } from 'vitest';
import {
  parseConfig,
  type BudgetStatus,
  type MidniteConfig,
  type Task,
  type TaskBoardEvent,
} from '@midnite/shared';
import type { ApprovalsService } from '../approvals/approvals.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { HeldTasksRegistry } from '../tasks/held-tasks.registry';
import type { TaskEventBus } from '../tasks/task-event-bus';
import type { TasksService } from '../tasks/tasks.service';
import type { UsageService } from '../usage/usage.service';
import { AgentPoolService } from './agent-pool.service';
import type { AgentRunnerService } from './agent-runner.service';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';

// Phase 50 Theme B — hard spend/rate caps block spawns at the scheduler.

function config(over: Partial<MidniteConfig['agent']> = {}): MidniteConfig {
  return parseConfig({ agent: { pool: 4, poolEnabled: true, ...over }, terminal: {}, knowledge: {}, gateway: {} });
}

function fakeTasks(ids: string[]) {
  const status = new Map(ids.map((id) => [id, 'todo']));
  const view = (id: string): Task => ({ id, title: id, status: status.get(id) }) as unknown as Task;
  return {
    listTasks: () => [...status.keys()].map(view),
    listReadyTodoTasks: () => [...status.keys()].filter((id) => status.get(id) === 'todo').map(view),
    getTask: (id: string) => view(id),
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

const approvals = () =>
  ({ isGloballyPaused: () => false, isTaskPaused: () => false }) as unknown as ApprovalsService;

const usageStub = (status: BudgetStatus) =>
  ({ checkBudget: () => status }) as unknown as UsageService;

const OK: BudgetStatus = { over: false, daily: null, monthly: null };
const OVER: BudgetStatus = {
  over: true,
  daily: { capUsd: 10, spentUsd: 12, exceeded: true },
  monthly: null,
};

function recordingBus() {
  const events: TaskBoardEvent[] = [];
  return { bus: { emit: (e: TaskBoardEvent) => void events.push(e) } as unknown as TaskEventBus, events };
}

const started = (runner: AgentRunnerService): string[] =>
  (runner.start as unknown as { mock: { calls: [Task][] } }).mock.calls.map((c) => c[0].id);

describe('AgentPoolScheduler — hard spend cap', () => {
  it('spawns nothing and holds every ready task "over-budget" when the cap is exceeded', async () => {
    const cfg = config();
    const tasks = fakeTasks(['t1', 't2']);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    const held = new HeldTasksRegistry();
    const notify = { notifyGuardrailHeld: vi.fn(async () => undefined) } as unknown as NotificationsService;
    const { bus, events } = recordingBus();
    const scheduler = new AgentPoolScheduler(
      cfg, tasks, pool, runner, undefined, approvals(), bus, usageStub(OVER), held, notify,
    );

    await scheduler.tick();

    expect(runner.start).not.toHaveBeenCalled();
    expect(held.get('t1')).toBe('over-budget');
    expect(held.get('t2')).toBe('over-budget');
    // One edge-triggered notification for the whole breach (count = 2).
    expect(notify.notifyGuardrailHeld).toHaveBeenCalledExactlyOnceWith('over-budget', 2);
    // Both newly-held tasks are re-broadcast so the board renders the chip.
    expect(events.filter((e) => e.type === 'task.updated')).toHaveLength(2);
  });

  it('does not re-notify on a second tick while still over budget (edge-triggered)', async () => {
    const cfg = config();
    const tasks = fakeTasks(['t1']);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    const held = new HeldTasksRegistry();
    const notify = { notifyGuardrailHeld: vi.fn(async () => undefined) } as unknown as NotificationsService;
    const scheduler = new AgentPoolScheduler(
      cfg, tasks, pool, runner, undefined, approvals(), recordingBus().bus, usageStub(OVER), held, notify,
    );

    await scheduler.tick();
    await scheduler.tick();

    expect(notify.notifyGuardrailHeld).toHaveBeenCalledTimes(1);
  });

  it('spawns normally and holds nothing when under the cap', async () => {
    const cfg = config();
    const tasks = fakeTasks(['t1', 't2']);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    const held = new HeldTasksRegistry();
    const scheduler = new AgentPoolScheduler(
      cfg, tasks, pool, runner, undefined, approvals(), recordingBus().bus, usageStub(OK), held,
    );

    await scheduler.tick();

    expect(started(runner).sort()).toEqual(['t1', 't2']);
    expect(held.snapshot().size).toBe(0);
  });

  it('clears the hold and re-broadcasts once spend drops back under the cap', async () => {
    const cfg = config();
    const tasks = fakeTasks(['t1']);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    const held = new HeldTasksRegistry();
    const budget = { current: OVER };
    const usage = { checkBudget: () => budget.current } as unknown as UsageService;
    const { bus, events } = recordingBus();
    const scheduler = new AgentPoolScheduler(cfg, tasks, pool, runner, undefined, approvals(), bus, usage, held);

    await scheduler.tick(); // held
    expect(held.get('t1')).toBe('over-budget');
    events.length = 0;
    budget.current = OK;

    await scheduler.tick(); // cleared → broadcast + spawn
    expect(held.get('t1')).toBeUndefined();
    expect(events.some((e) => e.type === 'task.updated')).toBe(true);
    expect(started(runner)).toEqual(['t1']);
  });
});

describe('AgentPoolScheduler — hard spawn-rate cap', () => {
  it('spawns up to the per-hour cap then holds the rest "rate-limited"', async () => {
    const cfg = config({ maxSpawnsPerHour: 1, pool: 4 });
    const tasks = fakeTasks(['t1', 't2']);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    const held = new HeldTasksRegistry();
    const notify = { notifyGuardrailHeld: vi.fn(async () => undefined) } as unknown as NotificationsService;
    const scheduler = new AgentPoolScheduler(
      cfg, tasks, pool, runner, undefined, approvals(), recordingBus().bus, usageStub(OK), held, notify,
    );

    await scheduler.tick();

    expect(started(runner)).toHaveLength(1); // exactly one spawn permitted this window
    // The unspawned ready task is held rate-limited.
    const rateLimited = [...held.snapshot().values()].filter((r) => r === 'rate-limited');
    expect(rateLimited).toHaveLength(1);
    expect(notify.notifyGuardrailHeld).toHaveBeenCalledExactlyOnceWith('rate-limited', 1);
  });

  it('ignores the rate cap when maxSpawnsPerHour is 0 (default = unlimited)', async () => {
    const cfg = config({ maxSpawnsPerHour: 0 });
    const tasks = fakeTasks(['t1', 't2', 't3']);
    const pool = new AgentPoolService(cfg, tasks);
    const runner = fakeRunner(pool, tasks);
    const held = new HeldTasksRegistry();
    const scheduler = new AgentPoolScheduler(
      cfg, tasks, pool, runner, undefined, approvals(), recordingBus().bus, usageStub(OK), held,
    );

    await scheduler.tick();

    expect(started(runner)).toHaveLength(3);
    expect(held.snapshot().size).toBe(0);
  });
});
