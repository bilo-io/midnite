import { beforeEach, describe, expect, it } from 'vitest';
import type { MidniteConfig, RepoConfig } from '@midnite/shared';
import { createTestDb } from '../test';
import { ReposRepository } from './repos.repository';
import { RepoDoesNotExistError, RepoNameTakenError, ReposService } from './repos.service';

function build(configRepos: RepoConfig[] = []) {
  const { db } = createTestDb();
  const config = { repos: configRepos } as unknown as MidniteConfig;
  return new ReposService(new ReposRepository(db), config);
}

describe('ReposService — CRUD', () => {
  let service: ReposService;
  beforeEach(() => {
    service = build();
  });

  it('creates a repo, normalising the path to ~-form and assigning an id', () => {
    const repo = service.create({ name: 'api', path: '~/Dev/api' });
    expect(repo.name).toBe('api');
    expect(repo.path).toBe('~/Dev/api');
    expect(repo.id).toBeTruthy();
    expect(service.list()).toHaveLength(1);
  });

  it('rejects a duplicate name with RepoNameTakenError', () => {
    service.create({ name: 'api', path: '~/Dev/api' });
    expect(() => service.create({ name: 'api', path: '~/Dev/other' })).toThrow(RepoNameTakenError);
  });

  it('lists repos ordered by name', () => {
    service.create({ name: 'zeta', path: '~/z' });
    service.create({ name: 'alpha', path: '~/a' });
    expect(service.list().map((r) => r.name)).toEqual(['alpha', 'zeta']);
  });

  it('finds a repo by name and returns undefined for an unknown name', () => {
    service.create({ name: 'api', path: '~/Dev/api' });
    expect(service.findByName('api')?.path).toBe('~/Dev/api');
    expect(service.findByName('nope')).toBeUndefined();
  });

  it('updates name and path', () => {
    const created = service.create({ name: 'api', path: '~/Dev/api' });
    const updated = service.update(created.id, { name: 'service', path: '~/Dev/service' });
    expect(updated.name).toBe('service');
    expect(updated.path).toBe('~/Dev/service');
    expect(service.findByName('api')).toBeUndefined();
  });

  it('rejects a rename onto another repo’s name', () => {
    service.create({ name: 'api', path: '~/Dev/api' });
    const web = service.create({ name: 'web', path: '~/Dev/web' });
    expect(() => service.update(web.id, { name: 'api' })).toThrow(RepoNameTakenError);
  });

  it('allows a no-op rename to the repo’s own name', () => {
    const created = service.create({ name: 'api', path: '~/Dev/api' });
    expect(() => service.update(created.id, { name: 'api', path: '~/Dev/api2' })).not.toThrow();
  });

  it('deletes a repo', () => {
    const created = service.create({ name: 'api', path: '~/Dev/api' });
    service.delete(created.id);
    expect(service.list()).toHaveLength(0);
  });

  it('throws RepoDoesNotExistError for unknown ids on get/update/delete', () => {
    expect(() => service.get('nope')).toThrow(RepoDoesNotExistError);
    expect(() => service.update('nope', { name: 'x' })).toThrow(RepoDoesNotExistError);
    expect(() => service.delete('nope')).toThrow(RepoDoesNotExistError);
  });
});

describe('ReposService — seed from config (onModuleInit)', () => {
  it('seeds config repos that are not already present', () => {
    const service = build([
      { name: 'api', path: '~/Dev/api' },
      { name: 'web', path: '~/Dev/web' },
    ]);
    service.onModuleInit();
    expect(service.list().map((r) => r.name)).toEqual(['api', 'web']);
  });

  it('is idempotent and never overwrites an existing DB row', () => {
    const service = build([{ name: 'api', path: '~/Dev/api' }]);
    service.onModuleInit();
    // A user edits the seeded repo's path in the DB...
    const seeded = service.findByName('api')!;
    service.update(seeded.id, { path: '~/Dev/api-moved' });
    // ...a second boot must not clobber it back to the config path.
    service.onModuleInit();
    expect(service.list()).toHaveLength(1);
    expect(service.findByName('api')?.path).toBe('~/Dev/api-moved');
  });
});
