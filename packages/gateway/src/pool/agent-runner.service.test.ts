import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task } from '@midnite/shared';
import type { UrlContextService } from '../agent/url-context.service';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from '../terminal/terminal.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';

// Prompt enrichment is exercised in url-context.service.spec; here it's a
// passthrough so the seed prompt reaches spawnAgentSession unchanged.
const noUrlContext = { enrich: async (p: string) => p } as unknown as UrlContextService;

function config(pool = 1, terminal: Record<string, unknown> = {}): MidniteConfig {
  return parseConfig({
    agent: { pool, runTimeoutMs: 60000 },
    terminal,
    gateway: {},
  });
}

function task(id: string, prompt?: string): Task {
  return { id, title: `title-${id}`, status: 'todo', priority: 1, retryCount: 0, prompt, tags: [], events: [] } as Task;
}

function fakeTasks(seed: Task[]) {
  const byId = new Map(seed.map((t) => [t.id, { ...t }]));
  const startTask = vi.fn((id: string) => {
    byId.get(id)!.status = 'wip';
  });
  const requeue = vi.fn((id: string, target: 'todo' | 'backlog' = 'todo') => {
    byId.get(id)!.status = target;
  });
  const retry = vi.fn((id: string) => {
    const t = byId.get(id)!;
    t.retryCount = (t.retryCount ?? 0) + 1;
    t.status = 'todo';
  });
  const updateStatus = vi.fn((id: string, status: string) => {
    byId.get(id)!.status = status as Task['status'];
  });
  const getTask = vi.fn((id: string) => {
    const t = byId.get(id);
    if (!t) throw new Error('not found');
    return t;
  });
  const service = {
    listTasks: () => [...byId.values()],
    startTask,
    requeue,
    retry,
    updateStatus,
    getTask,
  } as unknown as TasksService;
  return { service, startTask, requeue, retry, updateStatus, byId };
}

function fakeTerminal(opts?: { durable?: boolean; live?: string[]; reattachOk?: boolean }) {
  let onExit: ((code: number, signal: number | null) => void) | undefined;
  const spawnAgentSession = vi.fn(
    (_id: string, _spec: { prompt: string }, hooks: { onExit: (c: number, s: number | null) => void }) => {
      onExit = hooks.onExit;
      return { ok: true as const, pid: 42 };
    },
  );
  const killManagedRun = vi.fn();
  const interruptManagedRun = vi.fn();
  // Durable-backend recovery surface (Phase 17 §C2). `durable` + `live` are
  // configurable per test; reattach succeeds for live sessions by default.
  const reattachAgentSession = vi.fn(
    (id: string, hooks: { onExit: (c: number, s: number | null) => void }) => {
      const live = (opts?.live ?? []).includes(id) && (opts?.reattachOk ?? true);
      if (!live) return { ok: false as const, error: 'no live session' };
      onExit = hooks.onExit;
      return { ok: true as const, pid: 7 };
    },
  );
  const discardSession = vi.fn();
  const terminal = {
    spawnAgentSession,
    killManagedRun,
    interruptManagedRun,
    reattachAgentSession,
    discardSession,
    isDurable: () => opts?.durable ?? false,
    liveSessionIds: () => opts?.live ?? [],
  } as unknown as TerminalService;
  return {
    terminal,
    spawnAgentSession,
    killManagedRun,
    interruptManagedRun,
    reattachAgentSession,
    discardSession,
    fireExit: (c = 0) => onExit?.(c, null),
  };
}

describe('AgentRunnerService', () => {
  it('claims a slot, moves the task to wip and spawns a seeded session', async () => {
    const cfg = config();
    const { service, startTask } = fakeTasks([task('t1', '  do the thing  ')]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal, spawnAgentSession } = fakeTerminal();
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

    const ok = await runner.start(task('t1', '  do the thing  '));
    expect(ok).toBe(true);
    expect(startTask).toHaveBeenCalledWith('t1');
    expect(spawnAgentSession).toHaveBeenCalledWith(
      't1',
      { prompt: 'do the thing' },
      expect.anything(),
    );
    expect(pool.freeSlotCount()).toBe(0);
    expect(pool.snapshot().slots.find((s) => s.taskId === 't1')?.pid).toBe(42);
  });

  it('requeues and frees the slot when the spawn fails', async () => {
    const cfg = config();
    const { service, requeue } = fakeTasks([task('t1', 'x')]);
    const pool = new AgentPoolService(cfg, service);
    const terminal = {
      spawnAgentSession: vi.fn(() => ({ ok: false as const, error: 'no pty' })),
      killManagedRun: vi.fn(),
    } as unknown as TerminalService;
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

    const ok = await runner.start(task('t1', 'x'));
    expect(ok).toBe(false);
    expect(requeue).toHaveBeenCalledWith('t1');
    expect(pool.freeSlotCount()).toBe(1);
  });

  it('retries and releases the slot if the session exits while still wip (under the cap)', async () => {
    const cfg = config();
    const { service, retry } = fakeTasks([task('t1', 'x')]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal, fireExit } = fakeTerminal();
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

    await runner.start(task('t1', 'x')); // task is now wip
    fireExit(1); // PTY died unexpectedly

    expect(retry).toHaveBeenCalledWith('t1');
    expect(pool.freeSlotCount()).toBe(1);
  });

  it('abandons (does not retry) once the retry cap is exhausted', async () => {
    // maxRetries defaults to 3; seed a task that has already used all 3.
    const cfg = config();
    const exhausted = { ...task('t1', 'x'), retryCount: 3 } as Task;
    const { service, retry, updateStatus } = fakeTasks([exhausted]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal, fireExit } = fakeTerminal();
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

    await runner.start(exhausted); // wip
    fireExit(1); // crash again, but the budget is spent

    expect(retry).not.toHaveBeenCalled();
    expect(updateStatus).toHaveBeenCalledWith('t1', 'abandoned');
    expect(pool.freeSlotCount()).toBe(1);
  });

  it('abandons the task and kills the session on cancel', async () => {
    const cfg = config();
    const { service, updateStatus } = fakeTasks([task('t1', 'x')]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal, killManagedRun } = fakeTerminal();
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

    await runner.start(task('t1', 'x'));
    runner.cancel('t1');

    expect(updateStatus).toHaveBeenCalledWith('t1', 'abandoned');
    expect(killManagedRun).toHaveBeenCalledWith('t1');
  });

  it('requeues to todo (not abandoned) and interrupts the session on stop', async () => {
    const cfg = config();
    const { service, requeue, updateStatus } = fakeTasks([task('t1', 'x')]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal, interruptManagedRun } = fakeTerminal();
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

    await runner.start(task('t1', 'x')); // task is now wip
    runner.stop('t1');

    expect(requeue).toHaveBeenCalledWith('t1', 'todo');
    expect(updateStatus).not.toHaveBeenCalledWith('t1', 'abandoned');
    expect(interruptManagedRun).toHaveBeenCalledWith('t1');
  });

  it('stop sets the task non-running before the kill, so onExit does not retry', async () => {
    const cfg = config();
    // requeue (→ todo) runs before the PTY is reaped; the later exit must see a
    // non-running task and leave it alone (just free the slot), not retry it.
    const { service, retry } = fakeTasks([task('t1', 'x')]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal, fireExit } = fakeTerminal();
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

    await runner.start(task('t1', 'x')); // wip
    runner.stop('t1'); // → todo, interrupt scheduled
    fireExit(0); // PTY reaped after the interrupt

    expect(retry).not.toHaveBeenCalled();
    expect(pool.freeSlotCount()).toBe(1);
  });

  it('stop can land the task in backlog', async () => {
    const cfg = config();
    const { service, requeue } = fakeTasks([task('t1', 'x')]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal } = fakeTerminal();
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

    await runner.start(task('t1', 'x'));
    runner.stop('t1', 'backlog');

    expect(requeue).toHaveBeenCalledWith('t1', 'backlog');
  });

  describe('boot recovery (onModuleInit)', () => {
    const wip = (id: string) => ({ ...task(id), status: 'wip' as const });
    const waiting = (id: string) => ({ ...task(id), status: 'waiting' as const });

    it('pty backend: requeues every orphaned wip/waiting task, leaves others', () => {
      const cfg = config(4);
      const { service, requeue } = fakeTasks([
        wip('w1'),
        waiting('w2'),
        { ...task('d1'), status: 'done' } as Task,
        task('t1'),
      ]);
      const pool = new AgentPoolService(cfg, service);
      const { terminal, discardSession } = fakeTerminal({ durable: false });
      const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

      runner.onModuleInit();

      expect(requeue).toHaveBeenCalledTimes(2);
      expect(requeue).toHaveBeenCalledWith('w1');
      expect(requeue).toHaveBeenCalledWith('w2');
      expect(requeue).not.toHaveBeenCalledWith('d1');
      expect(requeue).not.toHaveBeenCalledWith('t1');
      expect(discardSession).not.toHaveBeenCalled();
    });

    it('tmux backend: reattaches live sessions, requeues dead ones, discards strays', () => {
      const cfg = config(4, { mode: 'tmux' });
      const { service, requeue } = fakeTasks([wip('w1'), waiting('w2')]);
      // w1's session survived; w2's died; 'ghost' is a live session with no task.
      const { terminal, reattachAgentSession, discardSession } = fakeTerminal({
        durable: true,
        live: ['w1', 'ghost'],
      });
      const pool = new AgentPoolService(cfg, service);
      const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

      runner.onModuleInit();

      expect(reattachAgentSession).toHaveBeenCalledWith('w1', expect.anything());
      expect(pool.slotForTask('w1')?.pid).toBe(7); // re-claimed its slot
      expect(requeue).toHaveBeenCalledWith('w2'); // dead session → requeued
      expect(requeue).not.toHaveBeenCalledWith('w1');
      expect(discardSession).toHaveBeenCalledWith('w2'); // dead session's secret forgotten
      expect(discardSession).toHaveBeenCalledWith('ghost'); // stray reaped
    });

    it('tmux backend: requeues + frees the slot when reattach fails', () => {
      const cfg = config(4, { mode: 'tmux' });
      const { service, requeue } = fakeTasks([wip('w1')]);
      // Listed as live but reattach returns not-ok (session vanished between
      // list and attach) — must release the slot and requeue, not leave it wip.
      const { terminal, reattachAgentSession } = fakeTerminal({
        durable: true,
        live: ['w1'],
        reattachOk: false,
      });
      const pool = new AgentPoolService(cfg, service);
      const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext);

      runner.onModuleInit();

      expect(reattachAgentSession).toHaveBeenCalledWith('w1', expect.anything());
      expect(requeue).toHaveBeenCalledWith('w1');
      expect(pool.slotForTask('w1')).toBeUndefined();
    });
  });
});
