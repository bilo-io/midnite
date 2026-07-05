import { mkdtemp, readdir, writeFile, utimes, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PortabilityService } from './portability.service';
import { BackupSchedulerService } from './backup-scheduler.service';

const HOUR = 3_600_000;
let dir = '';

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'midnite-bk-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function config(over: Record<string, unknown> = {}): MidniteConfig {
  return parseConfig({
    agent: {},
    terminal: {},
    gateway: {},
    backup: { enabled: true, intervalHours: 24, destinationDir: dir, retention: 3, ...over },
  });
}

function harness(cfg: MidniteConfig) {
  let n = 0;
  const exported: string[] = [];
  const portability = {
    export: vi.fn(() => {
      const filename = `midnite-backup-2026-07-05T00-00-0${n++}-000Z.zip`;
      exported.push(filename);
      return { archive: Buffer.from('zip-bytes'), filename, summary: {} };
    }),
  } as unknown as PortabilityService;
  const notifyBackupFailed = vi.fn(async () => {});
  const notifications = { notifyBackupFailed } as unknown as NotificationsService;
  return { svc: new BackupSchedulerService(cfg, portability, notifications), portability, notifyBackupFailed, exported };
}

async function writeArchive(name: string, ageMs = 0): Promise<void> {
  const p = join(dir, name);
  await writeFile(p, 'old');
  if (ageMs > 0) {
    const t = new Date(Date.now() - ageMs);
    await utimes(p, t, t);
  }
}

const zips = async (): Promise<string[]> =>
  (await readdir(dir)).filter((f) => /^midnite-backup-.*\.zip$/.test(f)).sort();

describe('BackupSchedulerService (Phase 49 F)', () => {
  it('writes an archive on the first run (none exist yet)', async () => {
    const { svc, portability } = harness(config());
    await svc.tick();
    expect(portability.export).toHaveBeenCalledOnce();
    expect(await zips()).toHaveLength(1);
  });

  it('skips when a recent archive already exists', async () => {
    await writeArchive('midnite-backup-recent.zip', 1 * HOUR); // 1h old, interval 24h
    const { svc, portability } = harness(config());
    await svc.tick();
    expect(portability.export).not.toHaveBeenCalled();
  });

  it('runs when the newest archive is older than intervalHours', async () => {
    await writeArchive('midnite-backup-stale.zip', 25 * HOUR);
    const { svc, portability } = harness(config());
    await svc.tick();
    expect(portability.export).toHaveBeenCalledOnce();
  });

  it('prunes to the retention count (newest kept), only touching backup files', async () => {
    // 3 stale archives + an unrelated file; retention 2 → after a run (writes a 4th)
    // only the 2 newest backups remain, and the unrelated file is untouched.
    await writeArchive('midnite-backup-a.zip', 30 * HOUR);
    await writeArchive('midnite-backup-b.zip', 29 * HOUR);
    await writeArchive('midnite-backup-c.zip', 28 * HOUR);
    await writeFile(join(dir, 'keep-me.txt'), 'user file');
    const { svc } = harness(config({ retention: 2 }));
    await svc.tick();
    const remaining = await zips();
    expect(remaining).toHaveLength(2);
    expect((await readdir(dir)).includes('keep-me.txt')).toBe(true);
  });

  it('is fail-open: an export error notifies + never throws', async () => {
    const { svc, notifyBackupFailed } = harness(config());
    (svc as unknown as { portability: PortabilityService }).portability.export = vi.fn(() => {
      throw new Error('disk full');
    });
    await expect(svc.tick()).resolves.toBeUndefined();
    expect(notifyBackupFailed).toHaveBeenCalledWith('disk full');
  });

  it('is a no-op when disabled', async () => {
    const { svc, portability } = harness(config({ enabled: false }));
    await svc.tick();
    expect(portability.export).not.toHaveBeenCalled();
  });

  it('status() reports config + recent archives, newest first', async () => {
    await writeArchive('midnite-backup-old.zip', 48 * HOUR);
    await writeArchive('midnite-backup-new.zip', 1 * HOUR);
    const { svc } = harness(config());
    const s = await svc.status();
    expect(s.enabled).toBe(true);
    expect(s.retention).toBe(3);
    expect(s.recent[0]?.filename).toBe('midnite-backup-new.zip');
    expect(s.lastRunAt).not.toBeNull();
    expect(s.nextRunAt).not.toBeNull();
  });
});
