import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { parseConfig, TaskDependencyError, type MidniteConfig, type Task } from '@midnite/shared';
import type { PrStatusService } from './pr-status.service';
import type { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

const config: MidniteConfig = parseConfig({ agent: {}, terminal: {}, gateway: {} });

/** A minimal multipart FastifyRequest yielding the given `field` parts. */
function multipartReq(fields: Array<[string, string]>): FastifyRequest {
  return {
    isMultipart: () => true,
    async *parts() {
      for (const [fieldname, value] of fields) {
        yield { type: 'field', fieldname, value };
      }
    },
  } as unknown as FastifyRequest;
}

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
    ...overrides,
  } as unknown as TasksService;
  const prStatus = { refresh: vi.fn(async () => fakeTask) } as unknown as PrStatusService;
  return { controller: new TasksController(service, config, prStatus), service, prStatus };
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

  // The create path validates blockers in the service (resolveDependencies); an
  // unknown one must surface as a clean 400, not a 500, so `add --depends-on
  // <bad>` reads clearly in the CLI.
  it('maps an unknown dependsOn blocker on create to 400', async () => {
    const uploadsDir = join(tmpdir(), `midnite-create-test-${randomUUID()}`);
    const cfg = parseConfig({ agent: {}, terminal: {}, gateway: { uploadsDir } });
    const service = {
      createFromPrompt: vi.fn(async () => {
        throw new TaskDependencyError('unknown-task', 'blocker task ghost not found');
      }),
    } as unknown as TasksService;
    const controller = new TasksController(service, cfg);
    try {
      await expect(
        controller.create(
          multipartReq([
            ['prompt', 'do the thing'],
            ['dependsOn', 'ghost'],
          ]),
        ),
      ).rejects.toThrow(BadRequestException);
    } finally {
      rmSync(uploadsDir, { recursive: true, force: true });
    }
  });
});
