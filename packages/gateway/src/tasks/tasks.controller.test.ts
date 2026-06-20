import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task } from '@midnite/shared';
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
    deleteTask: vi.fn(),
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
