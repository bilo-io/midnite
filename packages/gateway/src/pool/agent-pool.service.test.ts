import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import type { TasksService } from '../tasks/tasks.service';
import { AgentPoolService } from './agent-pool.service';

interface FakeTask {
  id: string;
  status: string;
}

function fakeTasks(initial: FakeTask[]) {
  let tasks = [...initial];
  const requeue = vi.fn((id: string) => {
    tasks = tasks.map((t) => (t.id === id ? { ...t, status: 'todo' } : t));
  });
  const service = {
    listTasks: (status?: string) => tasks.filter((t) => !status || t.status === status),
    // Pool's snapshot now sizes the queue via getCounts() (Phase 57 B), not by hydrating todos.
    getCounts: () => ({
      backlog: tasks.filter((t) => t.status === 'backlog').length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'wip' || t.status === 'waiting').length,
      done: tasks.filter((t) => t.status === 'done').length,
    }),
    requeue,
  } as unknown as TasksService;
  return { service, requeue, current: () => tasks };
}

function config(pool: number): MidniteConfig {
  return parseConfig({ agent: { pool }, terminal: {}, knowledge: {}, gateway: {} });
}

describe('AgentPoolService', () => {
  it('acquires up to capacity then returns null, and releases', () => {
    const { service } = fakeTasks([]);
    const pool = new AgentPoolService(config(2), service);

    expect(pool.capacity()).toBe(2);
    expect(pool.freeSlotCount()).toBe(2);

    expect(pool.acquire('a')).not.toBeNull();
    expect(pool.acquire('b')).not.toBeNull();
    expect(pool.freeSlotCount()).toBe(0);
    expect(pool.acquire('c')).toBeNull();

    pool.release('a');
    expect(pool.freeSlotCount()).toBe(1);
    expect(pool.acquire('c')).not.toBeNull();
    expect(pool.slotForTask('c')).toBeDefined();
  });

  it('reports a snapshot with busy + queued counts', () => {
    const { service } = fakeTasks([
      { id: 'q1', status: 'todo' },
      { id: 'q2', status: 'todo' },
    ]);
    const pool = new AgentPoolService(config(2), service);
    pool.acquire('a');
    pool.setPid('a', 999);

    const snap = pool.snapshot();
    expect(snap.capacity).toBe(2);
    expect(snap.busy).toBe(1);
    expect(snap.queuedTodo).toBe(2);
    expect(snap.slots.find((s) => s.taskId === 'a')?.pid).toBe(999);
  });

  // Boot reconcile (requeue / tmux-reattach of orphaned wip/waiting tasks) moved
  // to AgentRunnerService.onModuleInit (Phase 17 §C2) — see agent-runner.service.test.ts.

  it('trips the abort signal without freeing the slot', () => {
    const { service } = fakeTasks([]);
    const pool = new AgentPoolService(config(1), service);
    const signal = pool.acquire('a');
    expect(signal?.aborted).toBe(false);
    pool.abort('a');
    expect(signal?.aborted).toBe(true);
    expect(pool.freeSlotCount()).toBe(0);
  });
});
