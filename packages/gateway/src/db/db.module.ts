import { Global, Module, type OnModuleInit } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import * as schema from './schema';

export const DB_TOKEN = Symbol('MIDNITE_DB');

export type MidniteDb = BetterSQLite3Database<typeof schema>;

@Injectable()
class DbFactory {
  constructor(@Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig) {}

  build(): { db: MidniteDb; sqlite: Database.Database } {
    const dbPath = this.resolvePath(this.config.gateway.dbPath);
    mkdirSync(dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite, { schema });
    return { db, sqlite };
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
      useFactory: (factory: DbFactory) => factory.build().db,
    },
  ],
  exports: [DB_TOKEN],
})
export class DbModule implements OnModuleInit {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  onModuleInit(): void {
    const migrationsFolder = findMigrationsDir();
    migrate(this.db, { migrationsFolder });
  }
}
