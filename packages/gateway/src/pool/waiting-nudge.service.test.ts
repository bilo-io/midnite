import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task, type WaitReason } from '@midnite/shared';
import type { NotificationsService } from '../notifications/notifications.service';
import type { TasksService } from '../tasks/tasks.service';
import { WaitingNudgeService } from './waiting-nudge.service';

const HOUR = 3_600_000;

function config(overrides: Record<string, unknown> = {}): MidniteConfig {
  return parseConfig({
    agent: { waitingNudge: { afterHours: 2, repeatHours: 24, maxReminders: 3, tickMs: 60000, ...overrides } },
    terminal: {},
    gateway: {},
  });
}

function waitingTask(id: string, waitReason: WaitReason | undefined, updatedAt: string): Task {
  return {
    id,
    title: `title-${id}`,
    status: 'waiting',
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    waitReason,
    tags: [],
    dependsOn: [],
    events: [],
    updatedAt,
  } as Task;
}

function todoTask(id: string, createdAt: string): Task {
  return {
    id,
    title: `title-${id}`,
    status: 'todo',
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    dependsOn: [],
    events: [],
    createdAt,
  } as Task;
}

function harness(tasks: Task[]) {
  // Status-aware like the real repo: `listTasks(status)` filters by status.
  const listTasks = vi.fn((status?: string) => (status ? tasks.filter((t) => t.status === status) : tasks));
  const tasksService = { listTasks } as unknown as TasksService;
  const notifyNeedsAttention = vi.fn(async () => {});
  const notifyStuckTodo = vi.fn(async () => {});
  const notifications = { notifyNeedsAttention, notifyStuckTodo } as unknown as NotificationsService;
  return { tasksService, notifications, notifyNeedsAttention, notifyStuckTodo, listTasks };
}

const T0 = Date.parse('2026-07-03T00:00:00.000Z');

describe('WaitingNudgeService', () => {
  it('fires only once the waiting duration passes afterHours', async () => {
    const t = waitingTask('a', 'retries-exhausted', new Date(T0).toISOString());
    const { tasksService, notifications, notifyNeedsAttention } = harness([t]);
    const svc = new WaitingNudgeService(config(), tasksService, notifications);

    await svc.tick(T0 + 1 * HOUR); // under the 2h threshold
    expect(notifyNeedsAttention).not.toHaveBeenCalled();

    await svc.tick(T0 + 2 * HOUR); // at the threshold → first nudge
    expect(notifyNeedsAttention).toHaveBeenCalledTimes(1);
    expect(notifyNeedsAttention).toHaveBeenCalledWith(t, 'retries-exhausted', 0);
  });

  it('does not repeat before repeatHours, then repeats after', async () => {
    const t = waitingTask('a', 'agent-failed', new Date(T0).toISOString());
    const { tasksService, notifications, notifyNeedsAttention } = harness([t]);
    const svc = new WaitingNudgeService(config(), tasksService, notifications);

    await svc.tick(T0 + 2 * HOUR); // first nudge
    await svc.tick(T0 + 3 * HOUR); // only 1h later → no repeat
    expect(notifyNeedsAttention).toHaveBeenCalledTimes(1);

    await svc.tick(T0 + 26 * HOUR); // >24h since first → second nudge
    expect(notifyNeedsAttention).toHaveBeenCalledTimes(2);
    expect(notifyNeedsAttention).toHaveBeenLastCalledWith(t, 'agent-failed', 1);
  });

  it('stops after maxReminders', async () => {
    const t = waitingTask('a', 'timed-out', new Date(T0).toISOString());
    const { tasksService, notifications, notifyNeedsAttention } = harness([t]);
    const svc = new WaitingNudgeService(config({ maxReminders: 2 }), tasksService, notifications);

    await svc.tick(T0 + 2 * HOUR); // #1
    await svc.tick(T0 + 26 * HOUR); // #2
    await svc.tick(T0 + 50 * HOUR); // capped — no #3
    expect(notifyNeedsAttention).toHaveBeenCalledTimes(2);
  });

  it('ignores a needs-input wait (not a failure escalation)', async () => {
    const t = waitingTask('a', 'needs-input', new Date(T0).toISOString());
    const { tasksService, notifications, notifyNeedsAttention } = harness([t]);
    const svc = new WaitingNudgeService(config(), tasksService, notifications);

    await svc.tick(T0 + 100 * HOUR);
    expect(notifyNeedsAttention).not.toHaveBeenCalled();
  });

  it('is disabled when afterHours is 0 — tick is a no-op even after a long wait', async () => {
    const t = waitingTask('a', 'agent-failed', new Date(T0).toISOString());
    const { tasksService, notifications, notifyNeedsAttention } = harness([t]);
    const svc = new WaitingNudgeService(config({ afterHours: 0 }), tasksService, notifications);
    await svc.tick(T0 + 100 * HOUR);
    expect(notifyNeedsAttention).not.toHaveBeenCalled();
  });

  // Phase 69 B — once a task leaves `waiting` (resumed → wip) it drops out of the
  // waiting set, so the nudge loop stands down and won't reminder it again.
  it('stands down once the task is no longer waiting (resumed → wip)', async () => {
    const t = waitingTask('a', 'agent-failed', new Date(T0).toISOString());
    const store = [t];
    const listTasks = vi.fn((status?: string) =>
      status ? store.filter((x) => x.status === status) : store,
    );
    const tasksService = { listTasks } as unknown as TasksService;
    const notifyNeedsAttention = vi.fn(async () => {});
    const notifications = { notifyNeedsAttention } as unknown as NotificationsService;
    const svc = new WaitingNudgeService(config(), tasksService, notifications);

    await svc.tick(T0 + 2 * HOUR); // first nudge while waiting
    expect(notifyNeedsAttention).toHaveBeenCalledTimes(1);

    // Resume flips it to wip → it leaves the waiting set entirely.
    store[0] = { ...t, status: 'wip' } as Task;
    await svc.tick(T0 + 30 * HOUR); // would have repeated — but it's no longer waiting
    expect(notifyNeedsAttention).toHaveBeenCalledTimes(1);
  });
});

describe('WaitingNudgeService — aged-todo flag (Phase 53 C)', () => {
  it('does not flag aged todos by default (agedTodoHours = 0)', async () => {
    const t = todoTask('t', new Date(T0).toISOString());
    const { tasksService, notifications, notifyStuckTodo } = harness([t]);
    const svc = new WaitingNudgeService(config(), tasksService, notifications); // afterHours:2, agedTodoHours:0
    await svc.tick(T0 + 100 * HOUR);
    expect(notifyStuckTodo).not.toHaveBeenCalled();
  });

  it('flags a todo only once it has aged past agedTodoHours (measured from createdAt)', async () => {
    const t = todoTask('t', new Date(T0).toISOString());
    const { tasksService, notifications, notifyStuckTodo } = harness([t]);
    const svc = new WaitingNudgeService(config({ afterHours: 0, agedTodoHours: 6 }), tasksService, notifications);

    await svc.tick(T0 + 3 * HOUR); // under 6h
    expect(notifyStuckTodo).not.toHaveBeenCalled();

    await svc.tick(T0 + 6 * HOUR); // at the threshold → first flag (~6h, reminder 0)
    expect(notifyStuckTodo).toHaveBeenCalledTimes(1);
    expect(notifyStuckTodo).toHaveBeenCalledWith(t, 6, 0);
  });

  it('repeats after repeatHours and caps at maxReminders', async () => {
    const t = todoTask('t', new Date(T0).toISOString());
    const { tasksService, notifications, notifyStuckTodo } = harness([t]);
    const svc = new WaitingNudgeService(
      config({ afterHours: 0, agedTodoHours: 6, repeatHours: 24, maxReminders: 2 }),
      tasksService,
      notifications,
    );
    await svc.tick(T0 + 6 * HOUR); // #1
    await svc.tick(T0 + 7 * HOUR); // <24h since #1 → no repeat
    expect(notifyStuckTodo).toHaveBeenCalledTimes(1);
    await svc.tick(T0 + 30 * HOUR); // >24h → #2
    await svc.tick(T0 + 60 * HOUR); // capped → no #3
    expect(notifyStuckTodo).toHaveBeenCalledTimes(2);
  });

  it('does not treat a waiting task as an aged todo (status-scoped)', async () => {
    const w = waitingTask('w', 'agent-failed', new Date(T0).toISOString());
    const { tasksService, notifications, notifyStuckTodo } = harness([w]);
    const svc = new WaitingNudgeService(config({ afterHours: 0, agedTodoHours: 6 }), tasksService, notifications);
    await svc.tick(T0 + 100 * HOUR);
    expect(notifyStuckTodo).not.toHaveBeenCalled();
  });
});
