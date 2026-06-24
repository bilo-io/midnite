import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { UsersRepository } from './users.repository';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  UserDoesNotExistError,
  UsersService,
} from './users.service';

function makeService(): UsersService {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  const repo = new UsersRepository(db);
  return new UsersService(repo);
}

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
});
