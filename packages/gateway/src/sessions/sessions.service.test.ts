import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Task } from '@midnite/shared';
import type { AgentsService } from '../agents/agents.service';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from '../terminal/terminal.service';
import { SessionsService } from './sessions.service';

function makeService(opts: {
  tasks?: Task[];
  adHocIds?: string[];
  liveIds?: string[];
  agentCli?: string;
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
  return new SessionsService(tasks, terminal, agents);
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
