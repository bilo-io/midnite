import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidniteConfig, RepoConfig } from '@midnite/shared';
import type { AuditService } from '../audit/audit.service';
import { createTestDb } from '../test';
import { ReposRepository } from './repos.repository';
import { RepoDoesNotExistError, RepoNameTakenError, ReposService } from './repos.service';

function build(configRepos: RepoConfig[] = [], audit?: AuditService) {
  const { db } = createTestDb();
  const config = { repos: configRepos } as unknown as MidniteConfig;
  return new ReposService(new ReposRepository(db), config, audit);
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

  it('listPage returns { items, total }; list stays the full array (Phase 57 C)', () => {
    service.create({ name: 'aaa', path: '~/a' });
    service.create({ name: 'bbb', path: '~/b' });
    service.create({ name: 'ccc', path: '~/c' });
    expect(service.list()).toHaveLength(3);
    const page = service.listPage(undefined, { page: 1, limit: 2 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(2);
    // ordered by name asc
    expect(page.items.map((r) => r.name)).toEqual(['aaa', 'bbb']);
  });

  it('audits create / update / delete with the actor (Phase 50 D)', () => {
    const audit = { record: vi.fn() } as unknown as AuditService;
    const svc = build([], audit);
    const repo = svc.create({ name: 'api', path: '~/Dev/api' }, 'user-1');
    svc.update(repo.id, { name: 'core' }, 'user-2');
    svc.delete(repo.id, 'user-3');

    const actions = (audit.record as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].action);
    expect(actions).toEqual(['repo.created', 'repo.updated', 'repo.deleted']);
    const updateCall = (audit.record as ReturnType<typeof vi.fn>).mock.calls[1]![0];
    expect(updateCall.userId).toBe('user-2');
    expect(updateCall.payload.before.name).toBe('api');
    expect(updateCall.payload.after.name).toBe('core');
  });

  it('persists branchPrefix and prTemplate conventions', () => {
    const created = service.create({
      name: 'api',
      path: '~/Dev/api',
      branchPrefix: 'feature/',
      prTemplate: '## Summary',
    });
    expect(created.branchPrefix).toBe('feature/');
    expect(created.prTemplate).toBe('## Summary');
    expect(service.findByName('api')?.branchPrefix).toBe('feature/');
  });

  it('leaves conventions unset when omitted', () => {
    const created = service.create({ name: 'api', path: '~/Dev/api' });
    expect(created.branchPrefix).toBeUndefined();
    expect(created.prTemplate).toBeUndefined();
  });

  it('updates a convention and clears it with an empty string', () => {
    const created = service.create({ name: 'api', path: '~/Dev/api', branchPrefix: 'feature/' });
    const renamed = service.update(created.id, { branchPrefix: 'fix/' });
    expect(renamed.branchPrefix).toBe('fix/');
    const cleared = service.update(created.id, { branchPrefix: '' });
    expect(cleared.branchPrefix).toBeUndefined();
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

  it('seeds conventions from config', () => {
    const service = build([
      { name: 'api', path: '~/Dev/api', branchPrefix: 'feature/', prTemplate: '## Why' },
    ]);
    service.onModuleInit();
    const seeded = service.findByName('api');
    expect(seeded?.branchPrefix).toBe('feature/');
    expect(seeded?.prTemplate).toBe('## Why');
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
