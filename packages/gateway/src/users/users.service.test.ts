import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserIdentitiesRepository } from '../auth/user-identities.repository';
import * as schema from '../db/schema';
import { UsersRepository } from './users.repository';
import {
  InvalidCredentialsError,
  PasswordLoginUnavailableError,
  SsoEmailConflictError,
  type SsoProfile,
  SsoSignupClosedError,
  UserAlreadyExistsError,
  UserDoesNotExistError,
  UsersService,
} from './users.service';

function makeService(): UsersService {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  const repo = new UsersRepository(db);
  const identities = new UserIdentitiesRepository(db);
  return new UsersService(repo, undefined, undefined, identities);
}

const googleProfile = (over: Partial<SsoProfile> = {}): SsoProfile => ({
  provider: 'google',
  providerUserId: 'google-sub-1',
  email: 'sso@example.com',
  emailVerified: true,
  name: 'SSO User',
  ...over,
});

describe('UsersService', () => {
  let svc: UsersService;

  beforeEach(() => {
    svc = makeService();
  });

  it('registers a user and returns the public shape', async () => {
    const user = await svc.register('alice@example.com', 'Alice', 'Password123!');
    expect(user.email).toBe('alice@example.com');
    expect(user.name).toBe('Alice');
    expect((user as unknown as { passwordHash?: string }).passwordHash).toBeUndefined();
  });

  it('lowercases email on register', async () => {
    const user = await svc.register('BOB@Example.COM', 'Bob', 'Password123!');
    expect(user.email).toBe('bob@example.com');
  });

  it('throws UserAlreadyExistsError for duplicate email', async () => {
    await svc.register('dup@example.com', 'First', 'Password123!');
    await expect(svc.register('dup@example.com', 'Second', 'Password123!')).rejects.toThrow(
      UserAlreadyExistsError,
    );
  });

  it('validates correct credentials', async () => {
    await svc.register('eve@example.com', 'Eve', 'S3cur3Pass!');
    const user = await svc.validateCredentials('eve@example.com', 'S3cur3Pass!');
    expect(user.email).toBe('eve@example.com');
  });

  it('throws InvalidCredentialsError for wrong password', async () => {
    await svc.register('frank@example.com', 'Frank', 'GoodPass!');
    await expect(svc.validateCredentials('frank@example.com', 'WrongPass!')).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError for unknown email', async () => {
    await expect(svc.validateCredentials('nobody@example.com', 'Pass')).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('getUser throws UserDoesNotExistError for unknown id', () => {
    expect(() => svc.getUser('bad-id')).toThrow(UserDoesNotExistError);
  });

  it('updateProfile changes the name', async () => {
    const user = await svc.register('grace@example.com', 'Grace', 'Pass1234!');
    const updated = await svc.updateProfile(user.id, 'Grace Updated');
    expect(updated.name).toBe('Grace Updated');
  });

  it('updatePassword rejects wrong current password', async () => {
    const user = await svc.register('henry@example.com', 'Henry', 'OldPass!');
    await expect(svc.updatePassword(user.id, 'WrongOld!', 'NewPass!')).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  // --- Phase 70 B: SSO identity + provisioning ---------------------------------

  describe('findOrCreateFromSso', () => {
    it('provisions a brand-new user (+ null password) when signup is open', async () => {
      const user = await svc.findOrCreateFromSso(googleProfile(), { signupOpen: true });
      expect(user.email).toBe('sso@example.com');
      // The provisioned user is pure-SSO: password login must be rejected.
      await expect(svc.validateCredentials('sso@example.com', 'anything')).rejects.toThrow(
        PasswordLoginUnavailableError,
      );
      expect(svc.listIdentities(user.id)).toEqual([
        { provider: 'google', email: 'sso@example.com' },
      ]);
    });

    it('returns the same user on a second login with the same identity', async () => {
      const first = await svc.findOrCreateFromSso(googleProfile(), { signupOpen: true });
      const second = await svc.findOrCreateFromSso(googleProfile(), { signupOpen: true });
      expect(second.id).toBe(first.id);
      // No duplicate identity row was inserted.
      expect(svc.listIdentities(first.id)).toHaveLength(1);
    });

    it('auto-links to an existing user on a provider-verified matching email', async () => {
      const existing = await svc.register('sso@example.com', 'Pw User', 'Password123!');
      const linked = await svc.findOrCreateFromSso(googleProfile(), { signupOpen: false });
      expect(linked.id).toBe(existing.id); // linked, not a new account
      expect(svc.listIdentities(existing.id)).toEqual([
        { provider: 'google', email: 'sso@example.com' },
      ]);
      // The original password still works — the account gained SSO, didn't lose creds.
      const byPw = await svc.validateCredentials('sso@example.com', 'Password123!');
      expect(byPw.id).toBe(existing.id);
    });

    it('provisions a fresh account for an unverified email that does not collide', async () => {
      const created = await svc.findOrCreateFromSso(
        googleProfile({ emailVerified: false, email: 'fresh@example.com' }),
        { signupOpen: true },
      );
      expect(created.email).toBe('fresh@example.com');
      // Unverified → no auto-link candidate existed, so it's genuinely new.
      expect(svc.listIdentities(created.id)).toHaveLength(1);
    });

    it('never auto-links on an unverified email — rejects an existing-email collision', async () => {
      await svc.register('sso@example.com', 'Pw User', 'Password123!');
      await expect(
        svc.findOrCreateFromSso(googleProfile({ emailVerified: false }), { signupOpen: true }),
      ).rejects.toThrow(SsoEmailConflictError);
    });

    it('rejects a new unverified-email login when signup is closed', async () => {
      await svc.register('sso@example.com', 'Pw User', 'Password123!');
      await expect(
        svc.findOrCreateFromSso(googleProfile({ emailVerified: false }), { signupOpen: false }),
      ).rejects.toThrow(SsoSignupClosedError);
    });

    it('rejects provisioning a brand-new user when signup is closed', async () => {
      await expect(
        svc.findOrCreateFromSso(googleProfile(), { signupOpen: false }),
      ).rejects.toThrow(SsoSignupClosedError);
    });

    it('keeps google and github identities independent for the same email', async () => {
      const g = await svc.findOrCreateFromSso(googleProfile(), { signupOpen: true });
      // Same verified email via GitHub auto-links to the same user (email match).
      const gh = await svc.findOrCreateFromSso(
        googleProfile({ provider: 'github', providerUserId: 'gh-42' }),
        { signupOpen: false },
      );
      expect(gh.id).toBe(g.id);
      expect(svc.listIdentities(g.id)).toEqual([
        { provider: 'google', email: 'sso@example.com' },
        { provider: 'github', email: 'sso@example.com' },
      ]);
    });
  });
});
