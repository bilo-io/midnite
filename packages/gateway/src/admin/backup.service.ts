import { Inject, Injectable, Logger } from '@nestjs/common';
import type Database from 'better-sqlite3';
import { cp, mkdir, stat } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import type { BackupResponse, MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { SQLITE_TOKEN } from '../db/db.module';

/**
 * On-demand backup of the gateway's durable state. Uses SQLite's online backup
 * API (consistent even while the gateway is writing) for the DB, then copies the
 * uploads directory alongside it. Restore is a manual stop-and-copy (documented),
 * not an endpoint — swapping the open DB file under a live gateway is unsafe.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(SQLITE_TOKEN) private readonly sqlite: Database.Database,
  ) {}

  async backup(dir?: string): Promise<BackupResponse> {
    const at = new Date();
    const dbSource = this.resolve(this.config.gateway.dbPath);
    const target = dir ? this.resolve(dir) : this.defaultDir(dbSource, at);
    await mkdir(target, { recursive: true });

    // Consistent snapshot of the live DB — better-sqlite3 backup() copies pages
    // under a read lock without blocking writers for the whole operation.
    const dbPath = join(target, 'midnite.db');
    await this.sqlite.backup(dbPath);

    // Best-effort copy of uploads; absent dir is fine (a fresh install has none).
    const uploadsSource = this.resolve(this.config.gateway.uploadsDir);
    let uploadsPath: string | null = null;
    if (existsSync(uploadsSource)) {
      uploadsPath = join(target, 'uploads');
      await cp(uploadsSource, uploadsPath, { recursive: true });
    }

    const dbBytes = (await stat(dbPath)).size;
    this.logger.log(`backup written to ${target} (${dbBytes} bytes DB)`);
    return { dir: target, dbPath, uploadsPath, dbBytes, at: at.toISOString() };
  }

  private defaultDir(dbSource: string, at: Date): string {
    // <dbDir>/backups/backup-<ISO with ':' → '-' for filename safety>
    const stamp = at.toISOString().replace(/[:.]/g, '-');
    const base = existsSync(dbSource) && statSync(dbSource).isFile() ? dbSource : process.cwd();
    return join(resolve(base, '..'), 'backups', `backup-${stamp}`);
  }

  private resolve(p: string): string {
    return isAbsolute(p) ? p : resolve(process.cwd(), p);
  }
}
