import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task } from '@midnite/shared';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from '../terminal/terminal.service';
import type { AgentPoolService } from './agent-pool.service';
import type { AgentRunnerService } from './agent-runner.service';
import { PoolWatchdogService } from './pool-watchdog.service';

function config(
  opts: { enabled?: boolean; inactivityMs?: number; mode?: 'pty' | 'tmux' } = {},
): MidniteConfig {
  return parseConfig({
    agent: { watchdog: { enabled: opts.enabled ?? true, inactivityMs: opts.inactivityMs ?? 0 } },
    terminal: { mode: opts.mode ?? 'pty' },
    gateway: {},
  });
}

function task(id: string, status: Task['status']): Task {
  return { id, status } as Task;
}

type Health = { live: boolean; idleMs: number } | null;

function harness(opts: {
  cfg?: MidniteConfig;
  busy: string[];
  tasksById: Record<string, Task | undefined>;
  health?: Record<string, Health>;
  durable?: boolean;
}) {
  const runner = {
    reclaimOrphanedSlot: vi.fn(),
    reconcileUnhealthy: vi.fn(),
  };
  const pool = { busyTaskIds: () => opts.busy } as unknown as AgentPoolService;
  const tasks = {
    getTask: (id: string) => {
      if (!(id in opts.tasksById) || opts.tasksById[id] === undefined) {
        throw new Error('not found');
      }
      return opts.tasksById[id];
    },
  } as unknown as TasksService;
  const terminal = {
    isDurable: () => opts.durable ?? false,
    agentRunHealth: (id: string) => (opts.health ? (opts.health[id] ?? null) : null),
  } as unknown as TerminalService;
  const svc = new PoolWatchdogService(
    opts.cfg ?? config(),
    pool,
    tasks,
    terminal,
    runner as unknown as AgentRunnerService,
  );
  return { svc, runner };
}

describe('PoolWatchdogService.sweep', () => {
  it('does nothing when disabled', () => {
    const { svc, runner } = harness({
      cfg: config({ enabled: false }),
      busy: ['t1'],
      tasksById: { t1: undefined },
    });
    svc.sweep();
    expect(runner.reclaimOrphanedSlot).not.toHaveBeenCalled();
    expect(runner.reconcileUnhealthy).not.toHaveBeenCalled();
  });

  it('reclaims a slot whose task is gone', () => {
    const { svc, runner } = harness({ busy: ['t1'], tasksById: { t1: undefined } });
    svc.sweep();
    expect(runner.reclaimOrphanedSlot).toHaveBeenCalledWith('t1');
  });

  it.each(['done', 'abandoned', 'todo', 'backlog'] as const)(
    'reclaims a slot whose task is %s (not running)',
    (status) => {
      const { svc, runner } = harness({ busy: ['t1'], tasksById: { t1: task('t1', status) } });
      svc.sweep();
      expect(runner.reclaimOrphanedSlot).toHaveBeenCalledWith('t1');
      expect(runner.reconcileUnhealthy).not.toHaveBeenCalled();
    },
  );

  it('reconciles a wip task whose session handle is gone (lost)', () => {
    const { svc, runner } = harness({
      busy: ['t1'],
      tasksById: { t1: task('t1', 'wip') },
      health: { t1: null },
    });
    svc.sweep();
    expect(runner.reconcileUnhealthy).toHaveBeenCalledWith('t1', expect.objectContaining({ class: 'crash' }));
  });

  it('reconciles a wip task whose process is dead (not live)', () => {
    const { svc, runner } = harness({
      busy: ['t1'],
      tasksById: { t1: task('t1', 'wip') },
      health: { t1: { live: false, idleMs: 0 } },
    });
    svc.sweep();
    expect(runner.reconcileUnhealthy).toHaveBeenCalledWith('t1', expect.objectContaining({ class: 'crash' }));
  });

  it('reconciles a hung pty session as inactivity when the probe is enabled', () => {
    const { svc, runner } = harness({
      cfg: config({ inactivityMs: 600_000, mode: 'pty' }),
      busy: ['t1'],
      tasksById: { t1: task('t1', 'wip') },
      health: { t1: { live: true, idleMs: 700_000 } },
    });
    svc.sweep();
    expect(runner.reconcileUnhealthy).toHaveBeenCalledWith('t1', expect.objectContaining({ class: 'inactivity' }));
  });

  it('does NOT kill a quiet-but-live session when the inactivity probe is off (default)', () => {
    const { svc, runner } = harness({
      busy: ['t1'],
      tasksById: { t1: task('t1', 'wip') },
      health: { t1: { live: true, idleMs: 9_999_999 } },
    });
    svc.sweep();
    expect(runner.reconcileUnhealthy).not.toHaveBeenCalled();
    expect(runner.reclaimOrphanedSlot).not.toHaveBeenCalled();
  });

  it('does NOT apply the inactivity probe to a durable (tmux) backend', () => {
    const { svc, runner } = harness({
      cfg: config({ inactivityMs: 600_000, mode: 'tmux' }),
      busy: ['t1'],
      tasksById: { t1: task('t1', 'wip') },
      health: { t1: { live: true, idleMs: 700_000 } },
      durable: true,
    });
    svc.sweep();
    expect(runner.reconcileUnhealthy).not.toHaveBeenCalled();
  });

  it('leaves a healthy in-flight run untouched', () => {
    const { svc, runner } = harness({
      cfg: config({ inactivityMs: 600_000 }),
      busy: ['t1'],
      tasksById: { t1: task('t1', 'wip') },
      health: { t1: { live: true, idleMs: 1_000 } },
    });
    svc.sweep();
    expect(runner.reconcileUnhealthy).not.toHaveBeenCalled();
    expect(runner.reclaimOrphanedSlot).not.toHaveBeenCalled();
  });

  it('is fail-open: a throw on one slot does not stop the others', () => {
    const { svc, runner } = harness({
      busy: ['bad', 't2'],
      tasksById: { bad: task('bad', 'wip'), t2: undefined },
      health: {
        get bad(): Health {
          throw new Error('boom');
        },
      },
    });
    expect(() => svc.sweep()).not.toThrow();
    // t2 (gone) still reclaimed despite `bad` throwing.
    expect(runner.reclaimOrphanedSlot).toHaveBeenCalledWith('t2');
  });
});
