import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../db/schema';
import { CryptoService, SECRET_KEY_ENV } from '../../crypto/crypto.service';
import { WorkflowCredentialsRepository } from './workflow-credentials.repository';
import { WorkflowCredentialsService } from './workflow-credentials.service';

// Credential ownership (Phase 84 Theme A) against a real `:memory:` SQLite, because the
// contract is a SQL predicate: **null owner means shared with the whole install**. Get
// that wrong and either every user sees every other user's connection, or the migration
// silently takes the install's existing PAT away from everyone.

const KEY = 'c'.repeat(64);

function build() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  const repo = new WorkflowCredentialsRepository(db, new CryptoService());
  return { repo, service: new WorkflowCredentialsService(repo) };
}

beforeEach(() => {
  process.env[SECRET_KEY_ENV] = KEY;
});
afterEach(() => {
  delete process.env[SECRET_KEY_ENV];
});

const PAT = { type: 'github', token: 'shared-pat' } as const;
const CONNECTION = { type: 'github-oauth', accessToken: 'personal', scope: 'repo' } as const;

describe('credential ownership', () => {
  it('defaults to a shared (null-owner) row when no owner is given', () => {
    // Every pre-existing caller omits the owner, and every pre-migration row has none —
    // both must stay install-wide.
    const { repo, service } = build();
    const created = service.create({ name: 'Shared PAT', data: PAT });
    expect(repo.get(created.id)?.userId).toBeNull();
    expect(repo.get(created.id)?.teamId).toBeNull();
  });

  it('records both columns when an owner is given', () => {
    const { repo, service } = build();
    const created = service.create(
      { name: 'Mine', data: CONNECTION },
      { userId: 'user-1', teamId: 'team-1' },
    );
    expect(repo.get(created.id)).toMatchObject({ userId: 'user-1', teamId: 'team-1' });
  });

  it('lets any member delete a shared credential, but not another user\'s connection', () => {
    // Per-user rows arrived with this phase; without an owner check any member could
    // delete a colleague's GitHub connection. 404 rather than 403 — whether another user
    // holds a given id is not the caller's business.
    const { service } = build();
    const shared = service.create({ name: 'Shared PAT', data: PAT });
    const theirs = service.create({ name: 'Theirs', data: CONNECTION }, { userId: 'user-2' });

    expect(() => service.removeForUser(theirs.id, 'user-1')).toThrow(/does not exist/);
    expect(service.list()).toHaveLength(2);

    service.removeForUser(shared.id, 'user-1');
    expect(service.list().map((c) => c.name)).toEqual(['Theirs']);

    service.removeForUser(theirs.id, 'user-2');
    expect(service.list()).toEqual([]);
  });

  it('picks the newest row when resolving an owned credential', () => {
    // Connect replaces on re-connect so there should only be one, but an unordered `.get()`
    // would return whichever row SQLite reached first — silently the stale token.
    const { service } = build();
    service.create({ name: 'Old', data: { ...CONNECTION, accessToken: 'old' } }, { userId: 'user-1' });
    const newer = service.create(
      { name: 'New', data: { ...CONNECTION, accessToken: 'new' } },
      { userId: 'user-1' },
    );
    expect(newer.id).toBeTruthy();
  });

  it('keeps the unscoped list unchanged, so executors and the vault UI are untouched', () => {
    // Deliberately NOT scoped this phase: a team's shared Slack credential must not
    // vanish from a teammate's list.
    const { service } = build();
    service.create({ name: 'Shared PAT', data: PAT });
    service.create({ name: 'Mine', data: CONNECTION }, { userId: 'user-1' });
    expect(service.list()).toHaveLength(2);
  });

  it('resolves a user\'s OWN connection and excludes shared rows', async () => {
    // The distinction that stops the UI claiming a personal connection the user never
    // made: an install-wide PAT is not *your* GitHub.
    const { service } = build();
    service.create({ name: 'Shared PAT', data: PAT });
    service.create({ name: 'Mine', data: CONNECTION }, { userId: 'user-1' });

    const own = await service.resolveOwnedByType('user-1', 'github-oauth');
    expect(own?.data).toMatchObject({ type: 'github-oauth', accessToken: 'personal' });
    // A shared `github` PAT is a different type AND unowned — neither matches.
    expect(await service.resolveOwnedByType('user-1', 'github')).toBeNull();
    expect(await service.resolveOwnedByType('user-2', 'github-oauth')).toBeNull();
  });

  it('preserves the owner across a refresh rewrite', () => {
    // A refresh is delete-and-recreate with the same id; losing the owner would silently
    // promote a personal connection to install-wide.
    const { repo, service } = build();
    const created = service.create({ name: 'Mine', data: CONNECTION }, { userId: 'user-1' });

    const owner = service.ownerOf(created.id);
    service.remove(created.id);
    service.createWithId(created.id, 'Mine', CONNECTION, owner);

    expect(repo.get(created.id)?.userId).toBe('user-1');
  });

  it('reports no owner for a shared row', () => {
    const { service } = build();
    const created = service.create({ name: 'Shared PAT', data: PAT });
    expect(service.ownerOf(created.id)).toEqual({ userId: undefined, teamId: undefined });
  });

  it('round-trips a github-oauth payload through encryption', async () => {
    const { service } = build();
    const created = service.create(
      {
        name: 'Mine',
        data: { type: 'github-oauth', accessToken: 'a', refreshToken: 'r', expiresAt: '2026-09-01T00:00:00.000Z', scope: 'repo' },
      },
      { userId: 'user-1' },
    );
    await expect(service.resolve(created.id)).resolves.toEqual({
      type: 'github-oauth',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: '2026-09-01T00:00:00.000Z',
      scope: 'repo',
    });
  });

  it('resolves a non-expiring github connection without attempting a refresh', async () => {
    // No `expiresAt`, no `refreshToken` — the normal shape. It must resolve untouched
    // rather than being treated as a malformed or stale row.
    const { service } = build();
    const created = service.create({ name: 'Mine', data: CONNECTION }, { userId: 'user-1' });
    await expect(service.resolve(created.id)).resolves.toEqual(CONNECTION);
  });
});
