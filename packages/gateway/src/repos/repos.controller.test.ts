import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Repo } from '@midnite/shared';
import { ReposController } from './repos.controller';
import { RepoDoesNotExistError, RepoNameTakenError, type ReposService } from './repos.service';

const fakeRepo: Repo = {
  id: 'r1',
  name: 'api',
  path: '~/Dev/api',
  createdAt: '',
  updatedAt: '',
};

function build(overrides: Partial<Record<keyof ReposService, unknown>> = {}) {
  const service = {
    list: vi.fn(() => [fakeRepo]),
    get: vi.fn(() => fakeRepo),
    create: vi.fn(() => fakeRepo),
    update: vi.fn(() => fakeRepo),
    delete: vi.fn(),
    ...overrides,
  } as unknown as ReposService;
  return { controller: new ReposController(service), service };
}

describe('ReposController — body validation (400)', () => {
  it('rejects a create with a blank name', () => {
    const { controller } = build();
    expect(() => controller.create({ name: '  ', path: '~/x' }, null)).toThrow(BadRequestException);
  });

  it('rejects a create with a blank path', () => {
    const { controller } = build();
    expect(() => controller.create({ name: 'api', path: '' }, null)).toThrow(BadRequestException);
  });

  it('rejects an empty update body', () => {
    const { controller } = build();
    expect(() => controller.update('r1', {})).toThrow(BadRequestException);
  });
});

describe('ReposController — valid input delegates to the service', () => {
  it('creates with the parsed request and wraps the repo', () => {
    const { controller, service } = build();
    expect(controller.create({ name: 'api', path: '~/Dev/api' }, null)).toEqual({ repo: fakeRepo });
    expect(service.create).toHaveBeenCalledWith({ name: 'api', path: '~/Dev/api' }, undefined);
  });

  it('lists repos', () => {
    const { controller } = build();
    expect(controller.list()).toEqual([fakeRepo]);
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.remove('r1')).toEqual({ ok: true });
    expect(service.delete).toHaveBeenCalledWith('r1', null);
  });
});

describe('ReposController — domain errors translate to HTTP', () => {
  it('maps RepoDoesNotExistError to 404 on get', () => {
    const { controller } = build({
      get: vi.fn(() => {
        throw new RepoDoesNotExistError('repo nope not found');
      }),
    });
    expect(() => controller.get('nope')).toThrow(NotFoundException);
  });

  it('maps RepoNameTakenError to 409 on create', () => {
    const { controller } = build({
      create: vi.fn(() => {
        throw new RepoNameTakenError('a repo named "api" already exists');
      }),
    });
    expect(() => controller.create({ name: 'api', path: '~/Dev/api' }, null)).toThrow(ConflictException);
  });

  it('maps RepoDoesNotExistError to 404 on update', () => {
    const { controller } = build({
      update: vi.fn(() => {
        throw new RepoDoesNotExistError('repo nope not found');
      }),
    });
    expect(() => controller.update('nope', { name: 'x' })).toThrow(NotFoundException);
  });
});
