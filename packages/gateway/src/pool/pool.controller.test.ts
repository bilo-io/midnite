import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task } from '@midnite/shared';
import type { KnowledgeService } from '../knowledge/knowledge.service';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from '../terminal/terminal.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';
import { PoolController } from './pool.controller';

const knowledge = { listSources: () => [] } as unknown as KnowledgeService;

function config(pool = 1): MidniteConfig {
  return parseConfig({
    agent: { pool, runTimeoutMs: 60000 },
    terminal: {},
    knowledge: {},
    gateway: {},
  });
}

function task(id: string, status: Task['status'] = 'todo'): Task {
  return { id, title: `title-${id}`, status, priority: 1, retryCount: 0, prompt: 'x', events: [] } as Task;
}

function fakeTasks(seed: Task[]) {
  const byId = new Map(seed.map((t) => [t.id, { ...t }]));
  const service = {
    listTasks: () => [...byId.values()],
    startTask: vi.fn((id: string) => {
      byId.get(id)!.status = 'wip';
    }),
    requeue: vi.fn((id: string) => {
      byId.get(id)!.status = 'todo';
    }),
    retry: vi.fn(),
    updateStatus: vi.fn((id: string, status: string) => {
      byId.get(id)!.status = status as Task['status'];
    }),
    getTask: vi.fn((id: string) => {
      const t = byId.get(id);
      if (!t) throw new NotFoundException(`task ${id} not found`);
      return t;
    }),
  } as unknown as TasksService;
  return { service, byId };
}

function fakeTerminal(ok = true) {
  const spawnAgentSession = vi.fn(() =>
    ok ? { ok: true as const, pid: 42 } : { ok: false as const, error: 'no pty' },
  );
  return { terminal: { spawnAgentSession, killManagedRun: vi.fn() } as unknown as TerminalService };
}

function build(seed: Task[], poolSize = 1, spawnOk = true) {
  const cfg = config(poolSize);
  const { service, byId } = fakeTasks(seed);
  const pool = new AgentPoolService(cfg, service);
  const { terminal } = fakeTerminal(spawnOk);
  const runner = new AgentRunnerService(cfg, pool, service, terminal, knowledge);
  const controller = new PoolController(pool, runner, service);
  return { controller, pool, byId };
}

describe('PoolController.start', () => {
  it('starts a todo task: claims a slot, moves it to wip', async () => {
    const { controller, pool, byId } = build([task('t1', 'todo')]);

    const result = await controller.start('t1');

    expect(result.status).toBe('wip');
    expect(byId.get('t1')!.status).toBe('wip');
    expect(pool.freeSlotCount()).toBe(0);
  });

  it('starts a backlog task', async () => {
    const { controller, byId } = build([task('t1', 'backlog')]);
    await controller.start('t1');
    expect(byId.get('t1')!.status).toBe('wip');
  });

  it('404s for an unknown task', async () => {
    const { controller } = build([]);
    await expect(controller.start('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409s when the task is not in a startable status', async () => {
    const { controller } = build([task('t1', 'wip')]);
    await expect(controller.start('t1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('409s on a re-issued start for an already-running task', async () => {
    const { controller } = build([task('t1', 'todo')]);
    await controller.start('t1'); // now wip + holding a slot
    await expect(controller.start('t1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('409s when no agent slot is free', async () => {
    const { controller } = build([task('t1', 'todo'), task('t2', 'todo')], 1);
    await controller.start('t1'); // fills the only slot
    await expect(controller.start('t2')).rejects.toBeInstanceOf(ConflictException);
  });
});
