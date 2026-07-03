import { Global, Module } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import * as schema from './schema';
import { stampSchemaVersion } from './schema-version';

export const DB_TOKEN = Symbol('MIDNITE_DB');
/** The raw better-sqlite3 handle, for low-level ops (online backup) Drizzle doesn't expose. */
export const SQLITE_TOKEN = Symbol('MIDNITE_SQLITE');

export type MidniteDb = BetterSQLite3Database<typeof schema>;

@Injectable()
export class DbFactory {
  // Built once and memoized: DB_TOKEN and SQLITE_TOKEN must share the *same*
  // connection, so the factory must not open the file twice.
  private built?: { db: MidniteDb; sqlite: Database.Database };

  constructor(@Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig) {}

  private get(): { db: MidniteDb; sqlite: Database.Database } {
    if (this.built) return this.built;
    const dbPath = this.resolvePath(this.config.gateway.dbPath);
    mkdirSync(dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    // NORMAL is the recommended durability/throughput balance under WAL: a crash
    // can lose only the last in-flight transaction, never corrupt the file.
    sqlite.pragma('synchronous = NORMAL');
    // Wait rather than immediately throwing when another connection holds the
    // write lock (e.g. during a concurrent online backup checkpoint).
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite, { schema });
    // Apply migrations as part of *building* the handle — not in a separate
    // onModuleInit. Nest fully instantiates the provider graph (which resolves
    // DB_TOKEN through this factory) before it fires any lifecycle hook, so a
    // service whose `onModuleInit` queries a table (e.g. CouncilRunnerService's
    // stale-run sweep) is guaranteed the schema already exists. On a persisted
    // dev/prod DB the tables happen to be there from a prior run regardless of
    // hook order; on a *fresh* DB — every Playwright e2e run — they only exist
    // if migration is tied to handle construction like this. (Otherwise a feature
    // module's onModuleInit can run before DbModule's and crash the boot.)
    const migrationsDir = findMigrationsDir();
    migrate(db, { migrationsFolder: migrationsDir });
    // Phase 49 A: stamp the applied schema version (journal's highest idx) so data
    // portability can version + compatibility-check archives. Fail-soft.
    stampSchemaVersion(db, migrationsDir, new Date().toISOString());
    this.built = { db, sqlite };
    return this.built;
  }

  get db(): MidniteDb {
    return this.get().db;
  }

  get sqlite(): Database.Database {
    return this.get().sqlite;
  }

  private resolvePath(p: string): string {
    return isAbsolute(p) ? p : resolve(process.cwd(), p);
  }
}

function findMigrationsDir(): string {
  // dist/db/db.module.js → repo at packages/gateway/drizzle
  const candidates = [
    resolve(__dirname, '../../drizzle'),
    resolve(__dirname, '../../../drizzle'),
    resolve(process.cwd(), 'packages/gateway/drizzle'),
    resolve(process.cwd(), 'drizzle'),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, 'meta/_journal.json'))) return c;
  }
  return candidates[0]!;
}

@Global()
@Module({
  providers: [
    DbFactory,
    {
      provide: DB_TOKEN,
      inject: [DbFactory],
      useFactory: (factory: DbFactory) => factory.db,
    },
    {
      provide: SQLITE_TOKEN,
      inject: [DbFactory],
      useFactory: (factory: DbFactory) => factory.sqlite,
    },
  ],
  exports: [DB_TOKEN, SQLITE_TOKEN, DbFactory],
})
export class DbModule {}
