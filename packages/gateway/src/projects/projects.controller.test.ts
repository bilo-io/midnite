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
    );
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.remove('p1')).toEqual({ ok: true });
    expect(service.deleteProject).toHaveBeenCalledWith('p1');
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
