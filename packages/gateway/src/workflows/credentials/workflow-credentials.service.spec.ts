import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CreateWorkflowCredentialRequest } from '@midnite/shared';
import * as schema from '../../db/schema';
import { CryptoService, SECRET_KEY_ENV } from '../../crypto/crypto.service';
import { WorkflowCredentialsRepository } from './workflow-credentials.repository';
import { WorkflowCredentialsService } from './workflow-credentials.service';

const KEY = 'a'.repeat(64); // 32 bytes of hex

function makeDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  return db;
}

function build() {
  const db = makeDb();
  const crypto = new CryptoService();
  const repo = new WorkflowCredentialsRepository(db, crypto);
  const service = new WorkflowCredentialsService(repo);
  return { db, service };
}

const bearer: CreateWorkflowCredentialRequest = {
  name: 'GitHub token',
  data: { type: 'http-bearer', token: 'ghp_supersecret' },
};

describe('WorkflowCredentialsService (key configured)', () => {
  beforeEach(() => {
    process.env[SECRET_KEY_ENV] = KEY;
  });
  afterEach(() => {
    delete process.env[SECRET_KEY_ENV];
  });

  it('stores a credential and returns a secret-free view', () => {
    const { service } = build();
    const cred = service.create(bearer);
    expect(cred).toMatchObject({ name: 'GitHub token', type: 'http-bearer' });
    expect(cred.id).toBeTruthy();
    // No secret material on the public shape.
    expect(JSON.stringify(cred)).not.toContain('ghp_supersecret');
    expect(cred).not.toHaveProperty('data');
    expect(cred).not.toHaveProperty('token');
  });

  it('derives the type from the secret payload discriminant', () => {
    const { service } = build();
    const cred = service.create({
      name: 'SMTP',
      data: { type: 'smtp', host: 'mail', port: 587, username: 'u', password: 'p' },
    });
    expect(cred.type).toBe('smtp');
  });

  it('encrypts the secret at rest — the DB row never holds plaintext', () => {
    const { db, service } = build();
    service.create(bearer);
    const row = db.select().from(schema.workflowCredentials).get();
    expect(row?.data).toMatch(/^v1:/); // encrypted, self-describing
    expect(row?.data).not.toContain('ghp_supersecret');
  });

  it('resolve() round-trips the decrypted, validated secret for server-side use', () => {
    const { service } = build();
    const cred = service.create(bearer);
    expect(service.resolve(cred.id)).toEqual({ type: 'http-bearer', token: 'ghp_supersecret' });
  });

  it('list() exposes names + types only, never secrets', () => {
    const { service } = build();
    service.create(bearer);
    service.create({ name: 'Slack', data: { type: 'slack', token: 'xoxb-abc' } });
    const list = service.list();
    expect(list).toHaveLength(2);
    expect(JSON.stringify(list)).not.toContain('ghp_supersecret');
    expect(JSON.stringify(list)).not.toContain('xoxb-abc');
  });

  it('remove() deletes the credential', () => {
    const { service } = build();
    const cred = service.create(bearer);
    service.remove(cred.id);
    expect(service.list()).toHaveLength(0);
    expect(service.resolve(cred.id)).toBeNull();
  });

  it('remove() rejects an unknown id', () => {
    const { service } = build();
    expect(() => service.remove('nope')).toThrow(NotFoundException);
  });

  it('resolve() returns null for an unknown id', () => {
    const { service } = build();
    expect(service.resolve('nope')).toBeNull();
  });
});

describe('WorkflowCredentialsService (fail-closed, no key)', () => {
  beforeEach(() => {
    delete process.env[SECRET_KEY_ENV];
  });

  it('rejects create with a 400 when MIDNITE_SECRET_KEY is unset', () => {
    const { service } = build();
    expect(() => service.create(bearer)).toThrow(BadRequestException);
  });

  it('cannot resolve a credential written under a key once the key is gone', () => {
    process.env[SECRET_KEY_ENV] = KEY;
    const { service, db } = build();
    const cred = service.create(bearer);
    delete process.env[SECRET_KEY_ENV];
    // The encrypted row is still there, but without the key it is unusable.
    expect(db.select().from(schema.workflowCredentials).get()?.data).toMatch(/^v1:/);
    expect(service.resolve(cred.id)).toBeNull();
  });
});
