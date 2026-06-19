import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CryptoService, SECRET_KEY_ENV, isEncrypted } from '../crypto/crypto.service';
import * as schema from '../db/schema';
import { llmProviders } from '../db/schema';
import { ProviderCredentialsRepository } from './provider-credentials.repository';

// Exercises the real Drizzle queries + at-rest encryption against an in-memory
// SQLite. The repo encrypts on write / decrypts on read via CryptoService.
function makeDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return { db, sqlite };
}

const KEY = randomBytes(32).toString('hex');
const now = '2026-06-19T00:00:00.000Z';

describe('ProviderCredentialsRepository (encryption at rest)', () => {
  const original = process.env[SECRET_KEY_ENV];
  afterEach(() => {
    if (original === undefined) delete process.env[SECRET_KEY_ENV];
    else process.env[SECRET_KEY_ENV] = original;
  });

  describe('with MIDNITE_SECRET_KEY set', () => {
    beforeEach(() => {
      process.env[SECRET_KEY_ENV] = KEY;
    });

    it('stores the key encrypted but reads it back as plaintext', () => {
      const { db } = makeDb();
      const repo = new ProviderCredentialsRepository(db, new CryptoService());

      repo.upsertProvider('openai', { apiKey: 'sk-secret-7890' }, now);

      // Raw column is ciphertext (v1:) — the DB file never holds the plaintext.
      const raw = db.select().from(llmProviders).where(eq(llmProviders.provider, 'openai')).get();
      expect(raw?.apiKey).toBeTruthy();
      expect(isEncrypted(raw!.apiKey!)).toBe(true);
      expect(raw!.apiKey).not.toContain('sk-secret-7890');

      // Reads decrypt transparently (last-4 mask computed from this plaintext).
      expect(repo.getProvider('openai')?.apiKey).toBe('sk-secret-7890');
    });

    it('upgrades a legacy plaintext row in place on startup', () => {
      const { db } = makeDb();
      // Seed a legacy plaintext key directly (pre-encryption state).
      db.insert(llmProviders).values({ provider: 'openai', apiKey: 'sk-legacy', updatedAt: now }).run();

      const repo = new ProviderCredentialsRepository(db, new CryptoService());
      // The startup pass is wired to onApplicationBootstrap; invoke it directly.
      repo.onApplicationBootstrap();

      const raw = db.select().from(llmProviders).where(eq(llmProviders.provider, 'openai')).get();
      expect(isEncrypted(raw!.apiKey!)).toBe(true); // now encrypted at rest
      expect(repo.getProvider('openai')?.apiKey).toBe('sk-legacy'); // still readable
    });
  });

  describe('fail-closed with MIDNITE_SECRET_KEY unset', () => {
    beforeEach(() => delete process.env[SECRET_KEY_ENV]);

    it('rejects writing a new key', () => {
      const { db } = makeDb();
      const repo = new ProviderCredentialsRepository(db, new CryptoService());
      expect(() => repo.upsertProvider('openai', { apiKey: 'sk-x' }, now)).toThrow(/MIDNITE_SECRET_KEY/);
    });

    it('reads an encrypted row as having no usable key (disabled)', () => {
      // Encrypt with a key, then drop the env key and re-read.
      process.env[SECRET_KEY_ENV] = KEY;
      const { db } = makeDb();
      new ProviderCredentialsRepository(db, new CryptoService()).upsertProvider(
        'openai',
        { apiKey: 'sk-secret' },
        now,
      );
      delete process.env[SECRET_KEY_ENV];

      const repo = new ProviderCredentialsRepository(db, new CryptoService());
      expect(repo.getProvider('openai')?.apiKey).toBeNull(); // undecryptable → no key
    });

    it('leaves legacy plaintext rows untouched (no upgrade without a key)', () => {
      const { db } = makeDb();
      db.insert(llmProviders).values({ provider: 'openai', apiKey: 'sk-legacy', updatedAt: now }).run();
      const repo = new ProviderCredentialsRepository(db, new CryptoService());
      repo.onApplicationBootstrap();

      const raw = db.select().from(llmProviders).where(eq(llmProviders.provider, 'openai')).get();
      expect(raw!.apiKey).toBe('sk-legacy'); // unchanged
      expect(repo.getProvider('openai')?.apiKey).toBe('sk-legacy'); // still readable
    });
  });
});
