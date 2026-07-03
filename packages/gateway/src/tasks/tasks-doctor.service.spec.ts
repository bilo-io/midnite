import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task, type TaskFailure } from '@midnite/shared';
import type { TerminalService } from '../terminal/terminal.service';
import type { TasksService } from './tasks.service';
import { TasksDoctorService } from './tasks-doctor.service';

const HOUR = 3_600_000;
const MIN = 60_000;
const NOW = Date.parse('2026-07-03T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function config(doctor: Record<string, number> = {}): MidniteConfig {
  return parseConfig({ agent: { doctor }, terminal: {}, gateway: {} });
}

function task(p: Partial<Task> & { id: string }): Task {
  return {
    title: `title-${p.id}`,
    status: 'todo',
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    dependsOn: [],
    events: [],
    createdAt: ago(0),
    updatedAt: ago(0),
    ...p,
  } as Task;
}

function svc(opts: {
  tasks: Task[];
  failures?: TaskFailure[];
  idleBySession?: Record<string, number>;
  cfg?: MidniteConfig;
}): TasksDoctorService {
  const tasksService = {
    listTasks: () => opts.tasks,
    listRecentFailures: () => opts.failures ?? [],
  } as unknown as TasksService;
  const terminal = {
    agentRunHealth: (sessionId: string) => {
      const idle = opts.idleBySession?.[sessionId];
      return idle == null ? null : { live: true, idleMs: idle };
    },
  } as unknown as TerminalService;
  return new TasksDoctorService(opts.cfg ?? config(), tasksService, terminal);
}

describe('TasksDoctorService.report (Phase 53 E)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW); // pin Date.now() so sinceMs is deterministic
  });
  afterEach(() => vi.useRealTimers());

  it('surfaces needs-attention (failure waitReason) but not a plain needs-input wait', () => {
    const r = svc({
      tasks: [
        task({ id: 'a', status: 'waiting', waitReason: 'retries-exhausted', updatedAt: ago(0) }),
        task({ id: 'b', status: 'waiting', waitReason: 'needs-input', updatedAt: ago(0) }),
      ],
    }).report();
    expect(r.needsAttention.map((x) => x.id)).toEqual(['a']);
  });

  it('buckets waiting-too-long past the threshold, newest-duration first', () => {
    const r = svc({
      tasks: [
        task({ id: 'old', status: 'waiting', waitReason: 'agent-failed', updatedAt: ago(50 * HOUR) }),
        task({ id: 'fresh', status: 'waiting', waitReason: 'agent-failed', updatedAt: ago(1 * HOUR) }),
      ],
      cfg: config({ waitingTooLongHours: 24 }),
    }).report();
    expect(r.waitingTooLong.map((x) => x.id)).toEqual(['old']);
    expect(r.waitingTooLong[0]!.sinceMs).toBeGreaterThanOrEqual(49 * HOUR);
  });

  it('buckets aged todo past the threshold', () => {
    const r = svc({
      tasks: [
        task({ id: 'stale', status: 'todo', createdAt: ago(30 * HOUR) }),
        task({ id: 'new', status: 'todo', createdAt: ago(1 * HOUR) }),
      ],
      cfg: config({ agedTodoHours: 24 }),
    }).report();
    expect(r.agedTodo.map((x) => x.id)).toEqual(['stale']);
  });

  it('buckets stuck wip from the session heartbeat past wipSilentMinutes', () => {
    const r = svc({
      tasks: [
        task({ id: 'hung', status: 'wip', sessionId: 'hung' }),
        task({ id: 'busy', status: 'wip', sessionId: 'busy' }),
        task({ id: 'nolive', status: 'wip', sessionId: 'nolive' }),
      ],
      idleBySession: { hung: 20 * MIN, busy: 2 * MIN }, // nolive → no live session
      cfg: config({ wipSilentMinutes: 15 }),
    }).report();
    expect(r.stuckWip.map((x) => x.id)).toEqual(['hung']);
  });

  it('counts recent failures by class', () => {
    const f = (id: string, cls: TaskFailure['class']): TaskFailure => ({
      id,
      taskId: 't',
      class: cls,
      detail: 'x',
      retryIndex: 0,
      at: ago(0),
    });
    const r = svc({
      tasks: [],
      failures: [f('1', 'crash'), f('2', 'crash'), f('3', 'timeout')],
    }).report();
    expect(r.failureCountsByClass).toEqual({ crash: 2, timeout: 1 });
    expect(r.recentFailures).toHaveLength(3);
  });

  it('a 0 threshold disables its bucket', () => {
    const r = svc({
      tasks: [task({ id: 'stale', status: 'todo', createdAt: ago(999 * HOUR) })],
      cfg: config({ agedTodoHours: 0 }),
    }).report();
    expect(r.agedTodo).toEqual([]);
  });

  it('works without a terminal (stuck-wip empty, other buckets intact)', () => {
    const tasksService = {
      listTasks: () => [task({ id: 'w', status: 'wip', sessionId: 'w' })],
      listRecentFailures: () => [],
    } as unknown as TasksService;
    const r = new TasksDoctorService(config({ wipSilentMinutes: 15 }), tasksService, undefined).report();
    expect(r.stuckWip).toEqual([]);
  });
});
