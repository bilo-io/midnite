import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { FastifyReply } from 'fastify';
import { parseConfig, TaskDependencyError, type MidniteConfig, type Task } from '@midnite/shared';
import type { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

const config: MidniteConfig = parseConfig({ agent: {}, terminal: {}, gateway: {} });

function build(overrides: Partial<Record<keyof TasksService, unknown>> = {}) {
  const fakeTask = { id: 't1', title: 'x', status: 'todo', events: [] } as unknown as Task;
  const service = {
    getCounts: vi.fn(() => ({ backlog: 0, todo: 1, inProgress: 0, done: 0 })),
    listTasks: vi.fn(() => [fakeTask]),
    getTask: vi.fn(() => fakeTask),
    updateStatus: vi.fn(() => fakeTask),
    setProject: vi.fn(() => fakeTask),
    setTags: vi.fn(() => fakeTask),
    addLink: vi.fn(() => fakeTask),
    removeLink: vi.fn(() => fakeTask),
    addDependency: vi.fn(() => fakeTask),
    removeDependency: vi.fn(() => fakeTask),
    deleteTask: vi.fn(),
    createBulk: vi.fn(async () => ({ results: [], counts: { created: 0, skipped: 0, failed: 0 } })),
    exportMarkdown: vi.fn(() => ({ filename: 'x-2026-06-21.md', markdown: '# x' })),
    ...overrides,
  } as unknown as TasksService;
  return { controller: new TasksController(service, config), service };
}

describe('TasksController — query/body validation (400)', () => {
  it('rejects an unknown status query', () => {
    const { controller } = build();
    expect(() => controller.list('bogus')).toThrow(BadRequestException);
  });

  it('rejects an invalid status patch', () => {
    const { controller } = build();
    expect(() => controller.updateStatus('t1', { status: 'nope' })).toThrow(BadRequestException);
  });

  it('rejects a malformed project patch body', () => {
    const { controller } = build();
    expect(() => controller.updateProject('t1', { projectId: 42 })).toThrow(BadRequestException);
  });

  it('rejects a malformed tags body', () => {
    const { controller } = build();
    expect(() => controller.updateTags('t1', {})).toThrow(BadRequestException);
  });

  it('rejects a non-url link body', () => {
    const { controller } = build();
    expect(() => controller.addLink('t1', { url: 'not-a-url' })).toThrow(BadRequestException);
  });

  it('rejects a bulk body with neither raw nor lines', async () => {
    const { controller } = build();
    await expect(controller.createBulk({ repo: 'midnite' })).rejects.toThrow(BadRequestException);
  });
});

describe('TasksController — valid input delegates to the service', () => {
  it('lists by parsed status, trimming a blank projectId to undefined', () => {
    const { controller, service } = build();
    controller.list('todo', '   ');
    expect(service.listTasks).toHaveBeenCalledWith('todo', undefined);
  });

  it('passes the parsed status through on a valid patch', () => {
    const { controller, service } = build();
    controller.updateStatus('t1', { status: 'wip' });
    expect(service.updateStatus).toHaveBeenCalledWith('t1', 'wip');
  });

  it('passes a null projectId through (clear assignment)', () => {
    const { controller, service } = build();
    controller.updateProject('t1', { projectId: null });
    expect(service.setProject).toHaveBeenCalledWith('t1', null);
  });

  it('forwards url + optional label on a valid link body', () => {
    const { controller, service } = build();
    controller.addLink('t1', { url: 'https://example.com', label: 'docs' });
    expect(service.addLink).toHaveBeenCalledWith('t1', 'https://example.com', 'docs');
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.remove('t1')).toEqual({ ok: true });
    expect(service.deleteTask).toHaveBeenCalledWith('t1');
  });

  it('forwards a valid bulk body, trimming repo to undefined when blank', async () => {
    const { controller, service } = build();
    await controller.createBulk({ raw: 'a\nb', repo: '  midnite  ', priority: 2 });
    expect(service.createBulk).toHaveBeenCalledWith({
      raw: 'a\nb',
      lines: undefined,
      repo: 'midnite',
      projectId: undefined,
      priority: 2,
    });
  });
});

describe('TasksController — domain errors propagate to the HTTP layer', () => {
  it('lets a service NotFoundException surface from GET :id', () => {
    const { controller } = build({
      getTask: vi.fn(() => {
        throw new NotFoundException('task t9 does not exist');
      }),
    });
    expect(() => controller.get('t9')).toThrow(NotFoundException);
  });
});

describe('TasksController — export', () => {
  it('streams a markdown export with attachment headers', () => {
    const { controller, service } = build();
    const header = vi.fn();
    const send = vi.fn();
    const reply = { header, send } as unknown as FastifyReply;
    header.mockReturnValue(reply);
    send.mockReturnValue(reply);
    controller.exportTask('t1', reply, 'md');
    expect(service.exportMarkdown).toHaveBeenCalledWith('t1');
    expect(header).toHaveBeenCalledWith(
      'content-disposition',
      'attachment; filename="x-2026-06-21.md"',
    );
    expect(send).toHaveBeenCalledWith('# x');
  });

  it('defaults to md when no format is given', () => {
    const { controller, service } = build();
    const reply = { header: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() } as unknown as FastifyReply;
    controller.exportTask('t1', reply);
    expect(service.exportMarkdown).toHaveBeenCalledWith('t1');
  });

  it('rejects an unknown format', () => {
    const { controller } = build();
    expect(() => controller.exportTask('t1', {} as FastifyReply, 'csv')).toThrow(BadRequestException);
  });

  it('rejects a client-rendered format (pdf)', () => {
    const { controller } = build();
    expect(() => controller.exportTask('t1', {} as FastifyReply, 'pdf')).toThrow(BadRequestException);
  });

  it('lets a service NotFoundException surface for an unknown id', () => {
    const { controller } = build({
      exportMarkdown: vi.fn(() => {
        throw new NotFoundException('task t9 not found');
      }),
    });
    const reply = { header: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() } as unknown as FastifyReply;
    expect(() => controller.exportTask('t9', reply, 'md')).toThrow(NotFoundException);
  });
});

describe('TasksController — dependency routes', () => {
  it('rejects a body missing dependsOnId (400)', () => {
    const { controller } = build();
    expect(() => controller.addDependency('t1', {})).toThrow(BadRequestException);
  });

  it('adds a valid edge and delegates to the service', () => {
    const { controller, service } = build();
    controller.addDependency('t1', { dependsOnId: 't2' });
    expect(service.addDependency).toHaveBeenCalledWith('t1', 't2');
  });

  it('maps a self/unknown dependency error to 400', () => {
    const { controller } = build({
      addDependency: vi.fn(() => {
        throw new TaskDependencyError('self-reference', 'no self');
      }),
    });
    expect(() => controller.addDependency('t1', { dependsOnId: 't1' })).toThrow(BadRequestException);
  });

  it('maps a cycle dependency error to 409', () => {
    const { controller } = build({
      addDependency: vi.fn(() => {
        throw new TaskDependencyError('cycle', 'would cycle');
      }),
    });
    expect(() => controller.addDependency('t1', { dependsOnId: 't2' })).toThrow(ConflictException);
  });

  it('removeDependency delegates to the service', () => {
    const { controller, service } = build();
    controller.removeDependency('t1', 't2');
    expect(service.removeDependency).toHaveBeenCalledWith('t1', 't2');
  });
});
