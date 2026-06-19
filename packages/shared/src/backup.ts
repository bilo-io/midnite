import { z } from 'zod';

// On-demand snapshot of the gateway's durable state: a consistent copy of the
// SQLite DB (via SQLite's online backup API, safe while the gateway runs) plus
// the uploads directory. Restore is a manual stop-and-copy (see README) — there
// is deliberately no live-restore endpoint, since replacing the open DB file
// under a running gateway is unsafe.

export const BackupRequestSchema = z.object({
  /** Target directory. Defaults to `<dbDir>/backups/backup-<timestamp>`. */
  dir: z.string().optional(),
});
export type BackupRequest = z.infer<typeof BackupRequestSchema>;

export const BackupResponseSchema = z.object({
  /** Directory the snapshot was written to. */
  dir: z.string(),
  /** Absolute path of the backed-up SQLite file. */
  dbPath: z.string(),
  /** Absolute path of the copied uploads dir, or null if there was nothing to copy. */
  uploadsPath: z.string().nullable(),
  /** Size of the backed-up DB file in bytes. */
  dbBytes: z.number().int().nonnegative(),
  /** ISO timestamp the backup completed. */
  at: z.string(),
});
export type BackupResponse = z.infer<typeof BackupResponseSchema>;
