import { readdir, mkdir, stat, writeFile, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { BackupArchiveInfo, BackupStatus, MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { expandTilde } from '../fs/path-tilde';
import { NotificationsService } from '../notifications/notifications.service';
import { PortabilityService } from './portability.service';

/** Archives this scheduler writes/prunes are named `midnite-backup-<iso>.zip`
 *  (from the export service); the ISO stamp makes filename sort == chronological. */
const ARCHIVE_RE = /^midnite-backup-.*\.zip$/;

/**
 * Phase 49 F — scheduled auto-backup. A single gateway-owned loop (never a second
 * scheduler; mirrors PrStatusService's OnModuleInit/Destroy + setInterval+unref +
 * reentrancy guard) that writes a timestamped full-store archive to
 * `backup.destinationDir` every `intervalHours`, then prunes to `retention`.
 *
 * The **filesystem is the ledger**: "due" is decided from the newest existing
 * archive's mtime, so it survives a restart with no DB. Fail-open — a failed run
 * logs `warn` + fires a `backup.failed` notification, and never throws into the
 * tick. Disabled (no timer) when `backup.enabled` is false (the default), so it's
 * behaviour-preserving. Archives are secret-free (the export is, this slice).
 */
@Injectable()
export class BackupSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  // Runtime-tunable knobs (Settings → Data page), seeded from `midnite.json`'s
  // `backup.*` and overridable via `PATCH portability/backup/config` — like
  // `ws/settings`, an in-memory override that resets to the config default on
  // restart, not a rewrite of the config file. `retention`/`tickMs` aren't
  // exposed to the UI (yet), so they stay config-only.
  private enabled: boolean;
  private intervalHours: number;
  private destinationDir: string;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(PortabilityService) private readonly portability: PortabilityService,
    @Optional() @Inject(NotificationsService) private readonly notifications?: NotificationsService,
  ) {
    this.enabled = config.backup.enabled;
    this.intervalHours = config.backup.intervalHours;
    this.destinationDir = config.backup.destinationDir;
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('scheduled auto-backup disabled (backup.enabled = false)');
      return;
    }
    this.startTimer();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private startTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => void this.tick(), this.config.backup.tickMs);
    this.timer.unref?.();
    // Run once shortly after (re)start so a due backup doesn't wait a full tick.
    void this.tick();
    this.logger.log(
      `auto-backup loop started (every ${this.intervalHours}h → ${this.destinationDir}, keep ${this.config.backup.retention})`,
    );
  }

  /** Apply new runtime knobs from the Settings → Data page, restarting/stopping
   *  the loop as needed. Returns the fresh status for the caller to relay. */
  async updateConfig(next: { enabled: boolean; intervalHours: number; destinationDir: string }): Promise<BackupStatus> {
    this.enabled = next.enabled;
    this.intervalHours = next.intervalHours;
    this.destinationDir = next.destinationDir;
    if (this.enabled) {
      this.startTimer();
    } else if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    return this.status();
  }

  private dir(): string {
    return resolve(expandTilde(this.destinationDir));
  }

  /** Evaluate whether a backup is due and, if so, run it. Public so tests can
   *  drive it with an injected `now`. Fail-open — never throws into the tick. */
  async tick(now: number = Date.now()): Promise<void> {
    if (!this.enabled || this.running) return;
    this.running = true;
    try {
      const dir = this.dir();
      await mkdir(dir, { recursive: true });
      const archives = await this.listArchives(dir);
      const newestMs = archives[0]?.mtimeMs ?? 0;
      const dueMs = this.intervalHours * 3_600_000;
      if (archives.length > 0 && now - newestMs < dueMs) return; // not due yet

      // Secret-free archive (the export is, this slice) — no passphrase.
      const { archive, filename } = this.portability.export({ includeSecrets: false });
      await writeFile(join(dir, filename), archive);
      this.logger.log(`auto-backup written: ${filename} (${archive.length} bytes)`);
      await this.prune(dir);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(`auto-backup failed: ${reason}`);
      await this.notifications?.notifyBackupFailed(reason);
    } finally {
      this.running = false;
    }
  }

  /** Delete archives beyond the retention count, newest kept. Only touches files
   *  matching the backup name pattern — never unrelated files in the directory. */
  private async prune(dir: string): Promise<void> {
    const archives = await this.listArchives(dir);
    for (const a of archives.slice(this.config.backup.retention)) {
      await unlink(join(dir, a.name)).catch(() => undefined); // best-effort
    }
  }

  /** Backup archives in the directory, newest first (by mtime). */
  private async listArchives(dir: string): Promise<Array<{ name: string; mtimeMs: number; size: number }>> {
    const names = (await readdir(dir).catch(() => [] as string[])).filter((n) => ARCHIVE_RE.test(n));
    const stats = await Promise.all(
      names.map(async (name) => {
        const s = await stat(join(dir, name));
        return { name, mtimeMs: s.mtimeMs, size: s.size };
      }),
    );
    return stats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  }

  /** Read-only status for the Settings → Data page (Phase 49 F). Fail-open: an
   *  unreadable directory yields an empty recent list rather than throwing. */
  async status(): Promise<BackupStatus> {
    const archives = await this.listArchives(this.dir()).catch(() => []);
    const lastRunAt = archives[0] ? new Date(archives[0].mtimeMs).toISOString() : null;
    const nextRunAt =
      this.enabled && lastRunAt
        ? new Date(archives[0]!.mtimeMs + this.intervalHours * 3_600_000).toISOString()
        : null;
    const recent: BackupArchiveInfo[] = archives.slice(0, 10).map((a) => ({
      filename: a.name,
      sizeBytes: a.size,
      createdAt: new Date(a.mtimeMs).toISOString(),
    }));
    return {
      enabled: this.enabled,
      intervalHours: this.intervalHours,
      destinationDir: this.destinationDir,
      retention: this.config.backup.retention,
      lastRunAt,
      nextRunAt,
      recent,
    };
  }
}
