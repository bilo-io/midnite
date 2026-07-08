import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Task } from '@midnite/shared';
import type { AgentsService } from '../agents/agents.service';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from '../terminal/terminal.service';
import type { SessionUsageService } from './session-usage.service';
import type { SessionUsage } from '@midnite/shared';
import { SessionsService } from './sessions.service';

function makeService(opts: {
  tasks?: Task[];
  adHocIds?: string[];
  liveIds?: string[];
  agentCli?: string;
  usage?: Record<string, SessionUsage>;
}): SessionsService {
  const tasks = {
    listTasks: () => opts.tasks ?? [],
    archive: (id: string) => (opts.tasks ?? []).find((t) => t.id === id)!,
    unarchive: (id: string) => (opts.tasks ?? []).find((t) => t.id === id)!,
  } as unknown as TasksService;
  const adHoc = new Set(opts.adHocIds ?? []);
  const live = new Set(opts.liveIds ?? []);
  const terminal = {
    mintToken: (id: string) => `token-for-${id}`,
    hasAdHoc: (id: string) => adHoc.has(id),
    has: (id: string) => live.has(id),
  } as unknown as TerminalService;
  const agents = {
    getAgentCli: () => opts.agentCli ?? 'claude',
  } as unknown as AgentsService;
  const usageMap = opts.usage ?? {};
  const usage = {
    get: (id: string) => usageMap[id] ?? null,
    getManyMap: (ids: string[]) =>
      new Map(ids.filter((id) => usageMap[id]).map((id) => [id, usageMap[id]!])),
  } as unknown as SessionUsageService;
  return new SessionsService(tasks, terminal, agents, usage);
}

describe('SessionsService.mintTerminalToken', () => {
  it('mints for a real session/task', () => {
    const service = makeService({ tasks: [{ id: 'task-1' } as Task] });
    expect(service.mintTerminalToken('task-1').token).toBe('token-for-task-1');
  });

  it('mints for a registered ad-hoc terminal id', () => {
    const service = makeService({ adHocIds: ['adhoc-abc'] });
    expect(service.mintTerminalToken('adhoc-abc').token).toBe('token-for-adhoc-abc');
  });

  it('mints for a live managed-run terminal id', () => {
    const service = makeService({ liveIds: ['council-r1-p1'] });
    expect(service.mintTerminalToken('council-r1-p1').token).toBe('token-for-council-r1-p1');
  });

  it('throws for an unknown id', () => {
    const service = makeService({});
    expect(() => service.mintTerminalToken('nope')).toThrow(NotFoundException);
  });
});

describe('SessionsService.getDetail', () => {
  const task: Task = {
    id: 't1',
    title: 'Fix login',
    status: 'wip',
    priority: 0,
    retryCount: 2,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T01:00:00.000Z',
    events: [],
  } as unknown as Task;

  it('returns the summary plus createdAt/retryCount and flags the context estimate', () => {
    const svc = makeService({ tasks: [task] });
    const detail = svc.getDetail('t1');
    expect(detail.id).toBe('t1');
    expect(detail.linkedTaskId).toBe('t1');
    expect(detail.createdAt).toBe('2026-07-01T00:00:00.000Z');
    expect(detail.retryCount).toBe(2);
    expect(detail.contextEstimate).toBe(true);
  });

  it('throws NotFound for an unknown id', () => {
    const svc = makeService({ tasks: [task] });
    expect(() => svc.getDetail('nope')).toThrow(NotFoundException);
  });

  it('returns measured contextTokens (contextEstimate false) when harvested (Phase 61 A)', () => {
    const usage: SessionUsage = {
      sessionId: 't1',
      inputTokens: 100,
      outputTokens: 50,
      cachedReadTokens: 0,
      cachedWriteTokens: 0,
      contextTokens: 42_000,
      estCostUsd: 0.01,
      measured: true,
      updatedAt: '2026-07-08T00:00:00.000Z',
    };
    const svc = makeService({ tasks: [task], usage: { t1: usage } });
    const detail = svc.getDetail('t1');
    expect(detail.contextEstimate).toBe(false);
    expect(detail.contextTokens).toBe(42_000);
  });
});

describe('SessionsService.list agentCli', () => {
  const baseTask: Task = {
    id: 't1',
    title: 'T',
    status: 'wip',
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events: [],
  } as unknown as Task;

  it('includes agentCli from AgentsService on each summary', async () => {
    const svc = makeService({ tasks: [baseTask], agentCli: 'gemini' });
    const list = await svc.list();
    expect(list[0]!.agentCli).toBe('gemini');
  });

  it('defaults to claude when AgentsService returns claude', async () => {
    const svc = makeService({ tasks: [baseTask] });
    const list = await svc.list();
    expect(list[0]!.agentCli).toBe('claude');
  });
});
