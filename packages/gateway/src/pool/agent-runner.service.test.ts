import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task } from '@midnite/shared';
import type { KnowledgeService } from '../knowledge/knowledge.service';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from '../terminal/terminal.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';

// No knowledge-base links → buildAgentPrompt returns the bare task prompt.
const knowledge = { listSources: () => [] } as unknown as KnowledgeService;

function config(): MidniteConfig {
  return parseConfig({
    agent: { pool: 1, runTimeoutMs: 60000 },
    terminal: {},
    knowledge: {},
    gateway: {},
  });
}

function task(id: string, prompt?: string): Task {
  return { id, title: `title-${id}`, status: 'todo', priority: 1, retryCount: 0, prompt, events: [] } as Task;
}

function fakeTasks(seed: Task[]) {
  const byId = new Map(seed.map((t) => [t.id, { ...t }]));
  const startTask = vi.fn((id: string) => {
    byId.get(id)!.status = 'wip';
  });
  const requeue = vi.fn((id: string) => {
    byId.get(id)!.status = 'todo';
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

function fakeTerminal() {
  let onExit: ((code: number, signal: number | null) => void) | undefined;
  const spawnAgentSession = vi.fn(
    (_id: string, _spec: { prompt: string }, hooks: { onExit: (c: number, s: number | null) => void }) => {
      onExit = hooks.onExit;
      return { ok: true as const, pid: 42 };
    },
  );
  const killManagedRun = vi.fn();
  const terminal = { spawnAgentSession, killManagedRun } as unknown as TerminalService;
  return { terminal, spawnAgentSession, killManagedRun, fireExit: (c = 0) => onExit?.(c, null) };
}

describe('AgentRunnerService', () => {
  it('claims a slot, moves the task to wip and spawns a seeded session', async () => {
    const cfg = config();
    const { service, startTask } = fakeTasks([task('t1', '  do the thing  ')]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal, spawnAgentSession } = fakeTerminal();
    const runner = new AgentRunnerService(cfg, pool, service, terminal, knowledge);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, knowledge);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, knowledge);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, knowledge);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, knowledge);

    await runner.start(task('t1', 'x'));
    runner.cancel('t1');

    expect(updateStatus).toHaveBeenCalledWith('t1', 'abandoned');
    expect(killManagedRun).toHaveBeenCalledWith('t1');
  });
});
