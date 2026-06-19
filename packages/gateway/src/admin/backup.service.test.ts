import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  let root: string;
  let sqlite: Database.Database;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'midnite-backup-'));
    sqlite = new Database(join(root, 'midnite.db'));
    sqlite.exec('CREATE TABLE t (id TEXT); INSERT INTO t (id) VALUES (\'a\'), (\'b\')');
  });

  afterEach(() => {
    sqlite.close();
    rmSync(root, { recursive: true, force: true });
  });

  function service(uploadsDir: string): BackupService {
    const config: MidniteConfig = parseConfig({
      agent: {},
      terminal: {},
      knowledge: {},
      gateway: { dbPath: join(root, 'midnite.db'), uploadsDir },
    });
    return new BackupService(config, sqlite);
  }

  it('writes a consistent DB snapshot and copies uploads', async () => {
    const uploads = join(root, 'uploads');
    mkdirSync(uploads, { recursive: true });
    writeFileSync(join(uploads, 'a.png'), 'png-bytes');

    const out = join(root, 'out');
    const res = await service(uploads).backup(out);

    expect(res.dir).toBe(out);
    expect(existsSync(res.dbPath)).toBe(true);
    expect(res.dbBytes).toBeGreaterThan(0);
    expect(res.uploadsPath).toBe(join(out, 'uploads'));
    expect(readFileSync(join(out, 'uploads', 'a.png'), 'utf8')).toBe('png-bytes');

    // The snapshot is a real, queryable copy with the source rows.
    const copy = new Database(res.dbPath, { readonly: true });
    expect(copy.prepare('SELECT count(*) AS n FROM t').get()).toEqual({ n: 2 });
    copy.close();
  });

  it('omits uploads when the source dir is absent', async () => {
    const res = await service(join(root, 'no-such-uploads')).backup(join(root, 'out2'));
    expect(res.uploadsPath).toBeNull();
    expect(existsSync(res.dbPath)).toBe(true);
  });
});
