import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { UserIdentitiesRepository } from './user-identities.repository';

function makeRepo(): UserIdentitiesRepository {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  return new UserIdentitiesRepository(db);
}

const NOW = '2026-07-18T00:00:00.000Z';

describe('UserIdentitiesRepository', () => {
  let repo: UserIdentitiesRepository;

  beforeEach(() => {
    repo = makeRepo();
  });

  it('inserts an identity and finds it by (provider, providerUserId)', () => {
    repo.insertIdentity({
      id: 'i1',
      userId: 'u1',
      provider: 'google',
      providerUserId: 'sub-1',
      email: 'a@example.com',
      createdAt: NOW,
    });
    const found = repo.findByProviderIdentity('google', 'sub-1');
    expect(found?.userId).toBe('u1');
    expect(found?.email).toBe('a@example.com');
  });

  it('returns undefined for an unknown identity', () => {
    expect(repo.findByProviderIdentity('github', 'nope')).toBeUndefined();
  });

  it('treats the same providerUserId under different providers as distinct', () => {
    repo.insertIdentity({ id: 'i1', userId: 'u1', provider: 'google', providerUserId: '42', email: 'a@x.com', createdAt: NOW });
    repo.insertIdentity({ id: 'i2', userId: 'u2', provider: 'github', providerUserId: '42', email: 'b@x.com', createdAt: NOW });
    expect(repo.findByProviderIdentity('google', '42')?.userId).toBe('u1');
    expect(repo.findByProviderIdentity('github', '42')?.userId).toBe('u2');
  });

  it('enforces the unique (provider, providerUserId) index', () => {
    repo.insertIdentity({ id: 'i1', userId: 'u1', provider: 'google', providerUserId: 'dup', email: 'a@x.com', createdAt: NOW });
    expect(() =>
      repo.insertIdentity({ id: 'i2', userId: 'u2', provider: 'google', providerUserId: 'dup', email: 'c@x.com', createdAt: NOW }),
    ).toThrow(/UNIQUE/i);
  });

  it('lists every identity for a user', () => {
    repo.insertIdentity({ id: 'i1', userId: 'u1', provider: 'google', providerUserId: 's1', email: 'a@x.com', createdAt: NOW });
    repo.insertIdentity({ id: 'i2', userId: 'u1', provider: 'github', providerUserId: 's2', email: 'a@x.com', createdAt: NOW });
    repo.insertIdentity({ id: 'i3', userId: 'u2', provider: 'google', providerUserId: 's3', email: 'b@x.com', createdAt: NOW });
    const rows = repo.listForUser('u1');
    expect(rows.map((r) => r.provider).sort()).toEqual(['github', 'google']);
  });

  it('allows a null email snapshot', () => {
    repo.insertIdentity({ id: 'i1', userId: 'u1', provider: 'google', providerUserId: 's1', email: null, createdAt: NOW });
    expect(repo.findByProviderIdentity('google', 's1')?.email).toBeNull();
  });
});
