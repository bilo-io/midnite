import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Project } from '@midnite/shared';
import type { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

const fakeProject = {
  id: 'p1',
  name: 'Midnite',
  tag: 'mid',
  color: '#7c3aed',
  createdAt: '',
  updatedAt: '',
  sources: [],
} as unknown as Project;

function build(overrides: Partial<Record<keyof ProjectsService, unknown>> = {}) {
  const service = {
    listProjects: vi.fn(() => [fakeProject]),
    createProject: vi.fn(async () => fakeProject),
    getProject: vi.fn(() => fakeProject),
    updateProject: vi.fn(() => fakeProject),
    deleteProject: vi.fn(),
    ...overrides,
  } as unknown as ProjectsService;
  return { controller: new ProjectsController(service), service };
}

describe('ProjectsController — body validation (400)', () => {
  it('rejects a create with a blank name', async () => {
    const { controller } = build();
    await expect(controller.create({ name: '  ', tag: 'm', color: '#7c3aed' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a create with a non-hex color', async () => {
    const { controller } = build();
    await expect(controller.create({ name: 'X', tag: 'm', color: 'purple' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a malformed update body', () => {
    const { controller } = build();
    expect(() => controller.update('p1', { color: 'notahex' })).toThrow(BadRequestException);
  });
});

describe('ProjectsController — valid input delegates to the service', () => {
  it('creates with the parsed request and wraps the project', async () => {
    const { controller, service } = build();
    const res = await controller.create({ name: 'Midnite', tag: 'mid', color: '#7c3aed' });
    expect(res).toEqual({ project: fakeProject });
    expect(service.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Midnite', tag: 'mid', color: '#7c3aed' }),
      undefined,
      undefined,
    );
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.remove('p1')).toEqual({ ok: true });
    expect(service.deleteProject).toHaveBeenCalledWith('p1', null);
  });
});

describe('ProjectsController — domain errors propagate', () => {
  it('lets a service NotFoundException surface from GET :id', () => {
    const { controller } = build({
      getProject: vi.fn(() => {
        throw new NotFoundException('project p9 does not exist');
      }),
    });
    expect(() => controller.get('p9')).toThrow(NotFoundException);
  });
});

describe('ProjectsController — export', () => {
  function fakeReply() {
    const h = vi.fn().mockReturnThis();
    const reply = { header: h, send: vi.fn() };
    return reply as unknown as import('fastify').FastifyReply;
  }

  it('rejects an unsupported format with 400', () => {
    const { controller } = build({ exportMarkdown: vi.fn() });
    const reply = fakeReply();
    expect(() => controller.exportProject('p1', reply, 'html')).toThrow(BadRequestException);
  });

  it('rejects a client-rendered format (pdf) with 400', () => {
    const { controller } = build({ exportMarkdown: vi.fn() });
    const reply = fakeReply();
    expect(() => controller.exportProject('p1', reply, 'pdf')).toThrow(BadRequestException);
  });

  it('serves markdown via reply for format=md', () => {
    const { controller, service } = build({
      exportMarkdown: vi.fn(() => ({ filename: 'my-project-2026.md', markdown: '# My Project\n' })),
    });
    const reply = fakeReply();
    controller.exportProject('p1', reply, 'md');
    expect(service.exportMarkdown).toHaveBeenCalledWith('p1');
    expect(reply.header).toHaveBeenCalledWith('content-type', expect.stringContaining('text/markdown'));
    expect(reply.send).toHaveBeenCalledWith('# My Project\n');
  });

  it('defaults to md when no format supplied', () => {
    const { controller, service } = build({
      exportMarkdown: vi.fn(() => ({ filename: 'p.md', markdown: '# P\n' })),
    });
    const reply = fakeReply();
    controller.exportProject('p1', reply);
    expect(service.exportMarkdown).toHaveBeenCalledWith('p1');
  });
});

describe('ProjectsController — create-from-breakdown (Phase 28 Theme B)', () => {
  const fakeTask = { id: 't1', title: 'A', status: 'todo', events: [] } as unknown as Project;

  it('rejects a malformed breakdown body (400)', () => {
    const { controller } = build();
    expect(() => controller.createFromBreakdown('p1', { breakdown: { tasks: 'nope' } })).toThrow(
      BadRequestException,
    );
    expect(() => controller.createFromBreakdown('p1', {})).toThrow(BadRequestException);
  });

  it('delegates a valid breakdown (with optional repo) and wraps the tasks', () => {
    const createTasksFromBreakdown = vi.fn(() => [fakeTask]);
    const { controller } = build({ createTasksFromBreakdown });
    const breakdown = { tasks: [{ ref: 'a', title: 'A', dependsOn: [] }] };
    const res = controller.createFromBreakdown('p1', { breakdown, repo: 'midnite' });
    expect(res).toEqual({ tasks: [fakeTask] });
    expect(createTasksFromBreakdown).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ tasks: [expect.objectContaining({ ref: 'a', title: 'A' })] }),
      'midnite',
    );
  });
});
