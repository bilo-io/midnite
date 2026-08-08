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

  describe('resize', () => {
    it('grows by appending idle slots', () => {
      const { service } = fakeTasks([]);
      const pool = new AgentPoolService(config(2), service);

      expect(pool.resize(5)).toBe(5);
      expect(pool.capacity()).toBe(5);
      expect(pool.freeSlotCount()).toBe(5);
    });

    it('shrinks when the removed slots are idle', () => {
      const { service } = fakeTasks([]);
      const pool = new AgentPoolService(config(4), service);

      expect(pool.resize(1)).toBe(1);
      expect(pool.capacity()).toBe(1);
    });

    it('never evicts a busy slot — a running agent keeps its slot', () => {
      const { service } = fakeTasks([]);
      const pool = new AgentPoolService(config(3), service);
      pool.acquire('a');
      pool.acquire('b');

      // Asked for 1, but two agents are mid-run: shrink only as far as the idle
      // slots allow and report the capacity we actually landed on.
      expect(pool.resize(1)).toBe(2);
      expect(pool.slotForTask('a')).toBeDefined();
      expect(pool.slotForTask('b')).toBeDefined();

      // Once they finish, a later resize can complete the shrink.
      pool.release('a');
      expect(pool.resize(1)).toBe(1);
    });

    it('is a no-op for the current size or a negative size', () => {
      const { service } = fakeTasks([]);
      const pool = new AgentPoolService(config(3), service);
      expect(pool.resize(3)).toBe(3);
      expect(pool.resize(-1)).toBe(3);
    });

    it('keeps slot ids unique when a shrink steps over a busy slot, then grows', () => {
      // The collision case: with slot-2 busy, shrinking leaves the array shorter
      // than the highest id still in it, so deriving the next id from `length`
      // reissues an id a running agent already holds.
      const { service } = fakeTasks([]);
      const pool = new AgentPoolService(config(3), service);
      // Fill all three, then free the two *low* slots so the survivor is the
      // highest-indexed one — that's what makes `length` lag the largest id.
      pool.acquire('a');
      pool.acquire('b');
      pool.acquire('busy');
      pool.release('a');
      pool.release('b');
      const held = pool.slotForTask('busy')?.id;
      expect(held).toBe('slot-2');

      pool.resize(1); // keeps only the busy slot-2 → length 1, highest id 2
      pool.resize(3); // grows again: a length-derived id would re-mint slot-2

      const ids = pool.snapshot().slots.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      // The busy slot is still addressable by the same id it started with.
      expect(pool.slotForTask('busy')?.id).toBe(held);
    });
  });
});
