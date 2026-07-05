import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../db/schema';
import type { MidniteDb } from '../db/db.module';

/**
 * A fully-migrated in-memory database for gateway tests, plus the raw handle.
 *
 * `db` is the Drizzle wrapper repositories accept (the same `MidniteDb` type the
 * `DbModule` provides); `sqlite` is the underlying better-sqlite3 connection for
 * the rare low-level assertion. `close()` drops the connection — for `:memory:`
 * that frees the database entirely.
 */
export interface TestDbHandle {
  db: MidniteDb;
  sqlite: Database.Database;
  close(): void;
}

// `src/test/db.ts` → `packages/gateway/drizzle`. Mirrors the production
// `DbModule` resolver: prefer the path relative to this module (robust to the
// caller's cwd), fall back to the cwd-relative path moon's vitest run uses.
function migrationsFolder(): string {
  const candidates = [resolve(__dirname, '../../drizzle'), resolve(process.cwd(), 'drizzle')];
  for (const c of candidates) {
    if (existsSync(join(c, 'meta', '_journal.json'))) return c;
  }
  return candidates[0]!;
}

/**
 * Build a fresh, migrated `:memory:` SQLite database for a test.
 *
 * Consolidates the setup every repository/integration spec used to hand-roll
 * (open `:memory:` → `foreign_keys = ON` → `drizzle(schema)` → `migrate`). Call
 * it in a `beforeEach` so each test gets an isolated database. The WAL/synchronous
 * pragmas the production `DbModule` sets are file-only concerns and don't apply to
 * an in-memory connection, so they're deliberately omitted here.
 */
export function createTestDb(): TestDbHandle {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: migrationsFolder() });
  return { db, sqlite, close: () => sqlite.close() };
}

/** A {@link TestDbHandle} that counts executed SQL statements — the Phase 57
 *  benchmark backbone. `verbose` fires once per statement better-sqlite3 runs
 *  (driver-level, so it catches raw `sqlite.prepare` and drizzle queries alike),
 *  giving an exact query count for a hot path ("6001 queries" is a real number,
 *  not a guess). `resetQueryCount()` zeroes the counter around the measured
 *  section; migrations run before counting starts so schema setup isn't counted. */
export interface CountingDbHandle extends TestDbHandle {
  /** Statements executed since the last {@link CountingDbHandle.resetQueryCount}. */
  queryCount(): number;
  resetQueryCount(): void;
}

export function createCountingDb(): CountingDbHandle {
  let count = 0;
  const sqlite = new Database(':memory:', { verbose: () => void count++ });
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: migrationsFolder() });
  return {
    db,
    sqlite,
    close: () => sqlite.close(),
    queryCount: () => count,
    resetQueryCount: () => {
      count = 0;
    },
  };
}
