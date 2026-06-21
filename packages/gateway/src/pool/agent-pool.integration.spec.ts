import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Status, type TaskBoardEvent } from '@midnite/shared';
import * as schema from '../db/schema';
import { TaskClassifier } from '../agent/classifier.service';
import { PlannerService } from '../agent/planner.service';
import type { UrlContextService } from '../agent/url-context.service';
import { TasksRepository } from '../tasks/tasks.repository';
import { TasksService } from '../tasks/tasks.service';
import { TaskEventBus } from '../tasks/task-event-bus';
import type { ReposService } from '../repos/repos.service';
import type { TerminalService } from '../terminal/terminal.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';

// An integration harness wiring the *real* TasksService (+ repository, event bus)
// over an in-memory SQLite to the pool/scheduler/runner. Only the PTY boundary —
// TerminalService — is faked, so each spawn's onExit can be driven deterministically
// without a real process. This exercises the lifecycle end-to-end: persisted task
// state and the emitted WS events are asserted to agree.

interface FakeTerminal {
  service: TerminalService;
  /** Drive the captured onExit for a session (simulates the PTY exiting). */
  fireExit(taskId: string, code?: number): void;
  spawn: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  interrupt: ReturnType<typeof vi.fn>;
  failNextSpawn(error?: string): void;
}

function makeFakeTerminal(): FakeTerminal {
  const exits = new Map<string, (code: number, signal: number | null) => void>();
  let pid = 1000;
  let failure: string | null = null;
  const spawn = vi.fn(
    (sessionId: string, _spec: unknown, hooks: { onExit: (code: number, signal: number | null) => void }) => {
      if (failure) {
        const error = failure;
        failure = null;
        return { ok: false as const, error };
      }
      exits.set(sessionId, hooks.onExit);
      return { ok: true as const, pid: ++pid };
    },
  );
  const kill = vi.fn((taskId: string) => exits.delete(taskId));
  const interrupt = vi.fn();
  const service = {
    spawnAgentSession: spawn,
    killManagedRun: kill,
    interruptManagedRun: interrupt,
  } as unknown as TerminalService;
  return {
    service,
    spawn,
    kill,
    interrupt,
    fireExit(taskId, code = 0) {
      const onExit = exits.get(taskId);
      if (!onExit) throw new Error(`no live session for ${taskId}`);
      exits.delete(taskId);
      onExit(code, null);
    },
    failNextSpawn(error = 'terminal session limit reached') {
      failure = error;
    },
  };
}

function makeConfig(agent: Record<string, unknown>): MidniteConfig {
  return parseConfig({ agent, terminal: {}, knowledge: {}, gateway: {} });
}

interface Harness {
  config: MidniteConfig;
  db: ReturnType<typeof drizzle>;
  repo: TasksRepository;
  tasks: TasksService;
  bus: TaskEventBus;
  pool: AgentPoolService;
  runner: AgentRunnerService;
  scheduler: AgentPoolScheduler;
  terminal: FakeTerminal;
  events: TaskBoardEvent[];
  seedTask(id: string, status?: Status, partial?: Record<string, unknown>): void;
}

function makeHarness(agent: Record<string, unknown> = {}): Harness {
  const config = makeConfig({ pool: 2, poolEnabled: true, maxRetries: 3, ...agent });
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });

  const repo = new TasksRepository(db);
  const bus = new TaskEventBus();
  const events: TaskBoardEvent[] = [];
  bus.subscribe((e) => events.push(e));

  // Lifecycle paths never call the classifier/planner/repo registry; stubs
  // satisfy the ctor (tasks are seeded via repo.insertTask, not createFromPrompt).
  const classifier = {} as TaskClassifier;
  const planner = {} as PlannerService;
  const repos = { findByName: () => undefined } as unknown as ReposService;
  const tasks = new TasksService(repo, classifier, planner, bus, repos);

  const terminal = makeFakeTerminal();
  const pool = new AgentPoolService(config, tasks);
  const urlContext = { enrich: async (p: string) => p } as unknown as UrlContextService;
  const runner = new AgentRunnerService(config, pool, tasks, terminal.service, urlContext);
  const scheduler = new AgentPoolScheduler(config, tasks, pool, runner);

  let order = 0;
  function seedTask(id: string, status: Status = 'todo', partial: Record<string, unknown> = {}): void {
    const at = `2026-06-08T00:00:0${order++}.000Z`;
    repo.insertTask({
      id,
      title: id,
      kind: 'unknown',
      status,
      prompt: `do ${id}`,
      createdAt: at,
      updatedAt: at,
      ...partial,
    });
  }

  return { config, db, repo, tasks, bus, pool, runner, scheduler, terminal, events, seedTask };
}

/** Status of a task as persisted in the DB. */
function status(h: Harness, id: string): Status {
  return h.repo.hydrate(h.repo.getTask(id)!).status;
}

describe('agent pool — scheduler assignment', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness({ pool: 2 });
  });

  it('fills every free slot with todo tasks, leaving the rest queued', async () => {
    h.seedTask('a');
    h.seedTask('b');
    h.seedTask('c');

    await h.scheduler.tick();

    expect(h.pool.freeSlotCount()).toBe(0);
    expect(status(h, 'a')).toBe('wip');
    expect(status(h, 'b')).toBe('wip');
    expect(status(h, 'c')).toBe('todo');
    expect(h.terminal.spawn).toHaveBeenCalledTimes(2);
    expect(h.pool.slotForTask('a')?.pid).toBeGreaterThan(0);
  });

  it('emits task.updated events whose status agrees with the persisted state', async () => {
    h.seedTask('a');
    await h.scheduler.tick();

    const updates = h.events.filter((e) => e.type === 'task.updated');
    const last = updates.at(-1);
    expect(last?.type).toBe('task.updated');
    if (last?.type === 'task.updated') {
      expect(last.task.id).toBe('a');
      expect(last.task.status).toBe('wip');
      expect(last.task.status).toBe(status(h, 'a'));
    }
  });

  it('tick() assigns even when poolEnabled is false (the flag gates only the interval)', async () => {
    // The flag stops onModuleInit from starting the setInterval, but the public
    // tick() still assigns when driven directly — this pins that behaviour.
    h = makeHarness({ pool: 1, poolEnabled: false });
    h.seedTask('a');
    await h.scheduler.tick();
    expect(status(h, 'a')).toBe('wip');
  });
});

describe('agent pool — completion frees the slot for the next task', () => {
  it('reuses a freed slot on the next tick (Stop hook → done → complete)', async () => {
    const h = makeHarness({ pool: 1 });
    h.seedTask('a');
    h.seedTask('b');

    await h.scheduler.tick();
    expect(status(h, 'a')).toBe('wip');
    expect(status(h, 'b')).toBe('todo');
    expect(h.pool.freeSlotCount()).toBe(0);

    // Stop hook: mark done, then the runner reaps the session and frees the slot.
    h.tasks.markDone('a', 'https://example.com/pr/1');
    h.runner.complete('a');
    expect(status(h, 'a')).toBe('done');
    expect(h.pool.freeSlotCount()).toBe(1);
    expect(h.terminal.kill).toHaveBeenCalledWith('a');

    await h.scheduler.tick();
    expect(status(h, 'b')).toBe('wip');
    expect(h.pool.slotForTask('b')).toBeDefined();
    expect(h.pool.slotForTask('a')).toBeUndefined();
  });
});

describe('agent pool — crash handling on PTY exit', () => {
  it('retries a still-wip task (→ todo, retryCount bumped) and frees the slot', async () => {
    const h = makeHarness({ pool: 1, maxRetries: 3 });
    h.seedTask('a');
    await h.scheduler.tick();
    expect(status(h, 'a')).toBe('wip');

    // PTY died without the Stop hook completing the task → crash path.
    h.terminal.fireExit('a', 1);

    expect(status(h, 'a')).toBe('todo');
    expect(h.repo.getTask('a')!.retryCount).toBe(1);
    expect(h.pool.freeSlotCount()).toBe(1);

    const last = h.events.filter((e) => e.type === 'task.updated').at(-1);
    if (last?.type === 'task.updated') expect(last.task.status).toBe('todo');
  });

  it('abandons a crashed task once retries are exhausted (maxRetries=0)', async () => {
    const h = makeHarness({ pool: 1, maxRetries: 0 });
    h.seedTask('a');
    await h.scheduler.tick();

    h.terminal.fireExit('a', 1);

    expect(status(h, 'a')).toBe('abandoned');
    expect(h.repo.getTask('a')!.archivedAt).toBeTruthy();
    expect(h.pool.freeSlotCount()).toBe(1);
  });

  it('requeues and frees the slot when the spawn itself fails', async () => {
    const h = makeHarness({ pool: 1 });
    h.seedTask('a');
    h.terminal.failNextSpawn('terminal backend unavailable');

    await h.scheduler.tick();

    // Failed spawn leaves the task queued and the slot free for a later tick.
    expect(status(h, 'a')).toBe('todo');
    expect(h.pool.freeSlotCount()).toBe(1);
  });
});

describe('agent pool — restart recovery (persisted state is the source of truth)', () => {
  it('requeues orphaned wip/waiting tasks to todo on boot and leaves terminal states alone', () => {
    const h = makeHarness({ pool: 2 });
    h.seedTask('w1', 'wip');
    h.seedTask('w2', 'waiting');
    h.seedTask('d1', 'done');
    h.seedTask('t1', 'todo');

    // A fresh pool models a gateway restart: slots start idle, persisted state rules.
    h.pool.onModuleInit();

    expect(status(h, 'w1')).toBe('todo');
    expect(status(h, 'w2')).toBe('todo');
    expect(status(h, 'd1')).toBe('done');
    expect(status(h, 't1')).toBe('todo');
    expect(h.pool.freeSlotCount()).toBe(2);

    // Recovery emits a board update per requeued task, agreeing with the new state.
    const requeued = h.events.filter(
      (e): e is Extract<TaskBoardEvent, { type: 'task.updated' }> =>
        e.type === 'task.updated' && (e.task.id === 'w1' || e.task.id === 'w2'),
    );
    expect(requeued).toHaveLength(2);
    for (const e of requeued) expect(e.task.status).toBe('todo');
  });

  it('reconstructs the queue so the scheduler re-runs recovered tasks', async () => {
    const h = makeHarness({ pool: 2 });
    h.seedTask('w1', 'wip');
    h.pool.onModuleInit();
    expect(status(h, 'w1')).toBe('todo');

    await h.scheduler.tick();
    expect(status(h, 'w1')).toBe('wip');
    expect(h.pool.slotForTask('w1')).toBeDefined();
  });
});
