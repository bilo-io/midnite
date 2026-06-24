import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type CheckRun, type MidniteConfig, type Repo, type Task } from '@midnite/shared';
import type { ChecksService } from '../checks/checks.service';
import type { UrlContextService } from '../agent/url-context.service';
import type { ReposService } from '../repos/repos.service';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from '../terminal/terminal.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';

// Prompt enrichment is exercised in url-context.service.spec; here it's a
// passthrough so the seed prompt reaches spawnAgentSession unchanged.
const noUrlContext = { enrich: async (p: string) => p } as unknown as UrlContextService;

// No registered repos → seed prompt is left untouched (no conventions).
const noRepos = { findByName: () => undefined } as unknown as ReposService;

function reposWith(repo: Partial<Repo> & { name: string }): ReposService {
  return { findByName: (name: string) => (name === repo.name ? repo : undefined) } as unknown as ReposService;
}

function config(pool = 1, terminal: Record<string, unknown> = {}): MidniteConfig {
  return parseConfig({
    agent: { pool, runTimeoutMs: 60000 },
    terminal,
    gateway: {},
  });
}

function task(id: string, prompt?: string): Task {
  return { id, title: `title-${id}`, status: 'todo', priority: 1, retryCount: 0, fixAttempts: 0, prompt, tags: [], dependsOn: [], events: [] } as Task;
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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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

  it("appends the task repo's branch/PR conventions to the seed prompt", async () => {
    const cfg = config();
    const t = { ...task('t1', 'do the thing'), repo: 'api' } as Task;
    const { service } = fakeTasks([t]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal, spawnAgentSession } = fakeTerminal();
    const repos = reposWith({ name: 'api', branchPrefix: 'feature/', prTemplate: '## Why' });
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, repos);

    await runner.start(t);

    const prompt = spawnAgentSession.mock.calls[0]![1].prompt;
    expect(prompt).toContain('do the thing');
    expect(prompt).toContain('## Repository conventions');
    expect(prompt).toContain('`feature/`');
    expect(prompt).toContain('## Why');
  });

  it('leaves the seed prompt untouched when the task has no repo', async () => {
    const cfg = config();
    const { service } = fakeTasks([task('t1', 'do the thing')]);
    const pool = new AgentPoolService(cfg, service);
    const { terminal, spawnAgentSession } = fakeTerminal();
    const repos = reposWith({ name: 'api', branchPrefix: 'feature/' });
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, repos);

    await runner.start(task('t1', 'do the thing'));

    expect(spawnAgentSession.mock.calls[0]![1].prompt).toBe('do the thing');
  });

  it('requeues and frees the slot when the spawn fails', async () => {
    const cfg = config();
    const { service, requeue } = fakeTasks([task('t1', 'x')]);
    const pool = new AgentPoolService(cfg, service);
    const terminal = {
      spawnAgentSession: vi.fn(() => ({ ok: false as const, error: 'no pty' })),
      killManagedRun: vi.fn(),
    } as unknown as TerminalService;
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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
      const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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
      const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

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
      const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, noRepos);

      runner.onModuleInit();

      expect(reattachAgentSession).toHaveBeenCalledWith('w1', expect.anything());
      expect(requeue).toHaveBeenCalledWith('w1');
      expect(pool.slotForTask('w1')).toBeUndefined();
    });
  });

  // ── completeWithChecks (Phase 30 B2/B3) ──────────────────────────────────────

  function fakeGateTask(id: string, repo?: string, fixAttempts = 0): Task {
    return { id, title: `title-${id}`, status: 'wip', priority: 1, retryCount: 0, fixAttempts, repo, tags: [], dependsOn: [], events: [] } as Task;
  }

  function fakeGateTasks(t: Task) {
    const markDone = vi.fn();
    const markWaiting = vi.fn();
    const saveCheckRun = vi.fn();
    const recordCheckEvent = vi.fn();
    const incrementFixAttempts = vi.fn(() => ({ ...t, fixAttempts: t.fixAttempts + 1 }) as Task);
    // getTask returns the current task; after incrementFixAttempts it returns updated count
    let fixCount = t.fixAttempts;
    const getTask = vi.fn(() => ({ ...t, fixAttempts: fixCount }));
    incrementFixAttempts.mockImplementation(() => {
      fixCount += 1;
      return { ...t, fixAttempts: fixCount } as Task;
    });
    const service = {
      markDone, markWaiting, saveCheckRun, recordCheckEvent, getTask,
      incrementFixAttempts, listTasks: () => [],
    } as unknown as TasksService;
    return { service, markDone, markWaiting, saveCheckRun, recordCheckEvent, incrementFixAttempts, getTask };
  }

  function passRun(): CheckRun {
    return { id: 'cr1', taskId: 't1', trigger: 'gate', passed: true, startedAt: 'a', finishedAt: 'b', results: [] };
  }

  function failRun(): CheckRun {
    return { id: 'cr1', taskId: 't1', trigger: 'gate', passed: false, startedAt: 'a', finishedAt: 'b', results: [] };
  }

  function fakeChecks(run: CheckRun): ChecksService {
    return { run: vi.fn().mockResolvedValue(run) } as unknown as ChecksService;
  }

  function reposWithPath(name: string, path: string): ReposService {
    return { findByName: (n: string) => n === name ? { id: 'r1', name, path, createdAt: 'x', updatedAt: 'x' } : undefined } as unknown as ReposService;
  }

  function makeGateRunner(
    t: Task,
    checks: ChecksService | undefined,
    repos: ReposService = noRepos,
    checksEnabled = true,
    autoFixEnabled = false,
    autoFixMaxAttempts = 2,
  ) {
    const cfg = parseConfig({
      agent: { pool: 1, runTimeoutMs: 60000 },
      terminal: {},
      gateway: {},
      checks: checksEnabled
        ? {
            enabled: true,
            gates: [{ name: 'test', command: 'exit 0' }],
            autoFix: { enabled: autoFixEnabled, maxAttempts: autoFixMaxAttempts },
          }
        : { enabled: false },
    });
    const { service, markDone, markWaiting, saveCheckRun, recordCheckEvent, incrementFixAttempts } = fakeGateTasks(t);
    const pool = new AgentPoolService(cfg, service);
    // Claim the slot first so complete() can release it
    pool.acquire(t.id);
    const { terminal, killManagedRun, spawnAgentSession } = fakeTerminal();
    const runner = new AgentRunnerService(cfg, pool, service, terminal, noUrlContext, repos, undefined, checks);
    return { runner, pool, markDone, markWaiting, saveCheckRun, recordCheckEvent, incrementFixAttempts, killManagedRun, spawnAgentSession };
  }

  describe('completeWithChecks', () => {
    it('passes gate → markDone + slot released + checks.passed event', async () => {
      const t = fakeGateTask('t1', 'myrepo');
      const checks = fakeChecks(passRun());
      const repos = reposWithPath('myrepo', '/tmp/myrepo');
      const { runner, pool, markDone, markWaiting, saveCheckRun, recordCheckEvent } = makeGateRunner(t, checks, repos);

      await runner.completeWithChecks('t1', 'https://github.com/acme/repo/pull/1');

      expect(markDone).toHaveBeenCalledWith('t1', 'https://github.com/acme/repo/pull/1');
      expect(markWaiting).not.toHaveBeenCalled();
      expect(saveCheckRun).toHaveBeenCalledOnce();
      expect(recordCheckEvent).toHaveBeenCalledWith('t1', 'checks.started');
      expect(recordCheckEvent).toHaveBeenCalledWith('t1', 'checks.passed');
      expect(pool.slotForTask('t1')).toBeUndefined(); // slot released
    });

    it('fails gate → markWaiting + slot released + checks.failed event', async () => {
      const t = fakeGateTask('t1', 'myrepo');
      const checks = fakeChecks(failRun());
      const repos = reposWithPath('myrepo', '/tmp/myrepo');
      const { runner, pool, markDone, markWaiting, recordCheckEvent } = makeGateRunner(t, checks, repos);

      await runner.completeWithChecks('t1', 'https://github.com/acme/repo/pull/1');

      expect(markWaiting).toHaveBeenCalledWith('t1');
      expect(markDone).not.toHaveBeenCalled();
      expect(recordCheckEvent).toHaveBeenCalledWith('t1', 'checks.failed');
      expect(pool.slotForTask('t1')).toBeUndefined();
    });

    it('repo-less task skips gate → markDone directly, slot released', async () => {
      const t = fakeGateTask('t1'); // no repo
      const checks = fakeChecks(passRun());
      const { runner, pool, markDone, saveCheckRun, recordCheckEvent } = makeGateRunner(t, checks);

      await runner.completeWithChecks('t1', 'https://github.com/acme/repo/pull/1');

      expect(markDone).toHaveBeenCalledWith('t1', 'https://github.com/acme/repo/pull/1');
      expect(saveCheckRun).not.toHaveBeenCalled();
      expect(recordCheckEvent).not.toHaveBeenCalled();
      expect(pool.slotForTask('t1')).toBeUndefined();
    });

    it('checks disabled → skips gate, markDone directly', async () => {
      const t = fakeGateTask('t1', 'myrepo');
      const checks = fakeChecks(passRun());
      const repos = reposWithPath('myrepo', '/tmp/myrepo');
      const { runner, pool, markDone, saveCheckRun } = makeGateRunner(t, checks, repos, false);

      await runner.completeWithChecks('t1', 'https://github.com/acme/repo/pull/1');

      expect(markDone).toHaveBeenCalledWith('t1', 'https://github.com/acme/repo/pull/1');
      expect(saveCheckRun).not.toHaveBeenCalled();
      expect(pool.slotForTask('t1')).toBeUndefined();
    });
  });

  // ── completeWithChecks auto-fix (Phase 30 C) ─────────────────────────────────

  function failRunWithOutput(): CheckRun {
    return {
      id: 'cr1', taskId: 't1', trigger: 'gate', passed: false,
      startedAt: 'a', finishedAt: 'b',
      results: [{ name: 'test', command: 'npm test', exitCode: 1, passed: false, durationMs: 100, output: 'FAIL: assertion error' }],
    };
  }

  describe('completeWithChecks — auto-fix loop', () => {
    it('auto-fix off → fails gate → markWaiting, no re-spawn', async () => {
      const t = fakeGateTask('t1', 'myrepo', 0);
      const { runner, pool, markDone, markWaiting, spawnAgentSession, recordCheckEvent } =
        makeGateRunner(t, fakeChecks(failRun()), reposWithPath('myrepo', '/tmp/myrepo'), true, false);

      await runner.completeWithChecks('t1', 'https://github.com/acme/repo/pull/1');

      expect(markWaiting).toHaveBeenCalledWith('t1');
      expect(markDone).not.toHaveBeenCalled();
      expect(spawnAgentSession).not.toHaveBeenCalled(); // auto-fix is off, no re-spawn
      expect(recordCheckEvent).not.toHaveBeenCalledWith('t1', 'checks.fix.started');
      expect(pool.slotForTask('t1')).toBeUndefined();
    });

    it('auto-fix on + budget available → re-spawns agent with failure output, slot held', async () => {
      const t = fakeGateTask('t1', 'myrepo', 0);
      const { runner, pool, markDone, markWaiting, spawnAgentSession, incrementFixAttempts, recordCheckEvent } =
        makeGateRunner(t, fakeChecks(failRunWithOutput()), reposWithPath('myrepo', '/tmp/myrepo'), true, true, 2);

      await runner.completeWithChecks('t1', 'https://github.com/acme/repo/pull/1');

      expect(incrementFixAttempts).toHaveBeenCalledWith('t1');
      expect(recordCheckEvent).toHaveBeenCalledWith('t1', 'checks.fix.started');
      // Second spawn: the fix re-spawn (first was fakeTerminal's initial acquire which never happened here — only completeWithChecks spawns)
      expect(spawnAgentSession).toHaveBeenCalledOnce();
      const fixPromptArg = spawnAgentSession.mock.calls[0]![1].prompt as string;
      expect(fixPromptArg).toContain('failing checks');
      expect(fixPromptArg).toContain('FAIL: assertion error');
      expect(markWaiting).not.toHaveBeenCalled();
      expect(markDone).not.toHaveBeenCalled();
      // Slot NOT released — fix agent is now running
      expect(pool.slotForTask('t1')).toBeDefined();
    });

    it('budget exhausted → markWaiting + checks.fix.exhausted event, slot released', async () => {
      // fixAttempts already at maxAttempts (2)
      const t = fakeGateTask('t1', 'myrepo', 2);
      const { runner, pool, markWaiting, markDone, spawnAgentSession, recordCheckEvent } =
        makeGateRunner(t, fakeChecks(failRunWithOutput()), reposWithPath('myrepo', '/tmp/myrepo'), true, true, 2);

      await runner.completeWithChecks('t1', 'https://github.com/acme/repo/pull/1');

      expect(recordCheckEvent).toHaveBeenCalledWith('t1', 'checks.fix.exhausted');
      expect(markWaiting).toHaveBeenCalledWith('t1');
      expect(markDone).not.toHaveBeenCalled();
      expect(spawnAgentSession).not.toHaveBeenCalled(); // no re-spawn
      expect(pool.slotForTask('t1')).toBeUndefined();
    });

    it('pass after fix → markDone, slot released (gate re-entered via completeWithChecks)', async () => {
      // fixAttempts = 1 (one fix was already attempted), this time the gate passes
      const t = fakeGateTask('t1', 'myrepo', 1);
      const { runner, pool, markDone, markWaiting, recordCheckEvent } =
        makeGateRunner(t, fakeChecks(passRun()), reposWithPath('myrepo', '/tmp/myrepo'), true, true, 2);

      await runner.completeWithChecks('t1', 'https://github.com/acme/repo/pull/1');

      expect(markDone).toHaveBeenCalledWith('t1', 'https://github.com/acme/repo/pull/1');
      expect(markWaiting).not.toHaveBeenCalled();
      expect(recordCheckEvent).toHaveBeenCalledWith('t1', 'checks.passed');
      expect(pool.slotForTask('t1')).toBeUndefined();
    });
  });
});
