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

function harness(tasks: Task[]) {
  const listTasks = vi.fn((_status?: string) => tasks);
  const tasksService = { listTasks } as unknown as TasksService;
  const notifyNeedsAttention = vi.fn(async () => {});
  const notifications = { notifyNeedsAttention } as unknown as NotificationsService;
  return { tasksService, notifications, notifyNeedsAttention, listTasks };
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
});
