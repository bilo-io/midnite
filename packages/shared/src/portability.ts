import { z } from 'zod';

// Phase 49 — Data portability. The wire contract for full-store backup & restore:
// a versioned, self-describing archive (Theme A defines the shapes; B/C fill them).
// The archive is a **zip** with `manifest.json` at the root + one JSON file per
// domain under `domains/<domain>.json` (see the container note in phase-49). Every
// shape here is validated on both export and import — never untyped JSON.

/** Secret handling for an export. `excluded` drops secret-bearing fields; `passphrase`
 *  re-wraps them under a passphrase-derived key (raw per-instance blobs aren't portable). */
export const SECRETS_MODES = ['excluded', 'passphrase'] as const;
export const SecretsModeSchema = z.enum(SECRETS_MODES);
export type SecretsMode = z.infer<typeof SecretsModeSchema>;

/**
 * Root archive manifest. `schemaVersion` is the exporting instance's applied
 * migration index (see `schema_meta`) — import compares it to its own to decide
 * compatibility. `domains` lists which per-domain payloads the archive carries.
 */
export const ArchiveManifestSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  appVersion: z.string(),
  createdAt: z.string(),
  domains: z.array(z.string()),
  secretsMode: SecretsModeSchema,
});
export type ArchiveManifest = z.infer<typeof ArchiveManifestSchema>;

/**
 * A compact export summary (Phase 49 D): the manifest plus per-domain record
 * counts. The export endpoint returns it in the `X-Midnite-Backup-Manifest`
 * response header so a client (CLI/web) can print a per-domain summary without
 * unzipping the archive.
 */
export const BackupSummarySchema = ArchiveManifestSchema.extend({
  counts: z.record(z.number().int().nonnegative()),
});
export type BackupSummary = z.infer<typeof BackupSummarySchema>;

/**
 * The portable domains a backup currently carries + a human label, for a
 * display-only "what's included" summary (Phase 49 E). Mirrors the export
 * service's `sources()` — the secret-free *work* domains this slice ships;
 * `users`/`teams` + secret-bearing domains join with the import/secrets slices.
 */
export const PORTABLE_DOMAINS: ReadonlyArray<{ name: string; label: string }> = [
  { name: 'tasks', label: 'Tasks' },
  { name: 'projects', label: 'Projects' },
  { name: 'repos', label: 'Repos' },
  { name: 'memories', label: 'Memories' },
  { name: 'notes', label: 'Notes' },
  { name: 'routines', label: 'Routines' },
  { name: 'media', label: 'Media' },
  { name: 'councils', label: 'Councils' },
  { name: 'ideas', label: 'Ideas' },
  { name: 'approvalRules', label: 'Approval rules' },
  { name: 'workflows', label: 'Workflows' },
];

/** One archive file on disk (Phase 49 F auto-backup status). */
export const BackupArchiveInfoSchema = z.object({
  filename: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type BackupArchiveInfo = z.infer<typeof BackupArchiveInfoSchema>;

/**
 * Scheduled auto-backup status (Phase 49 F), read by the Settings → Data page.
 * `lastRunAt` is the newest archive's timestamp (the filesystem is the ledger),
 * `nextRunAt` = lastRunAt + intervalHours (null when disabled or never run).
 */
export const BackupStatusSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number(),
  destinationDir: z.string(),
  retention: z.number().int(),
  lastRunAt: z.string().nullable(),
  nextRunAt: z.string().nullable(),
  recent: z.array(BackupArchiveInfoSchema),
});
export type BackupStatus = z.infer<typeof BackupStatusSchema>;

/**
 * Envelope for one domain's exported rows (`domains/<name>.json`). Generic over the
 * row shape so each domain validates its own records on both ends. `count` is a
 * self-check against `records.length`.
 */
export function domainPayloadSchema<T extends z.ZodTypeAny>(record: T) {
  return z.object({
    domain: z.string(),
    count: z.number().int().nonnegative(),
    records: z.array(record),
  });
}
/** The un-parameterised envelope (rows as unknown) — for manifest-level handling. */
export const DomainPayloadSchema = domainPayloadSchema(z.unknown());
export type DomainPayload<T = unknown> = { domain: string; count: number; records: T[] };

/** Options for producing an archive (Theme B consumes these). */
export const ExportOptionsSchema = z.object({
  /** Which domains to include; omitted/empty = all portable domains. */
  domains: z.array(z.string()).optional(),
  includeSecrets: z.boolean().default(false),
  /** Required when includeSecrets is true — secrets are re-wrapped under this. */
  passphrase: z.string().min(1).optional(),
});
export type ExportOptions = z.infer<typeof ExportOptionsSchema>;

/** How an archive's schema version relates to the importing instance. */
export const SCHEMA_COMPAT = ['ok', 'newer-archive', 'older-archive'] as const;
export const SchemaCompatSchema = z.enum(SCHEMA_COMPAT);
export type SchemaCompat = z.infer<typeof SchemaCompatSchema>;

/** A dry-run import summary: per-domain counts, conflicts, and the version verdict. */
export const ImportPreviewSchema = z.object({
  manifest: ArchiveManifestSchema,
  /** Records found per domain in the archive. */
  domainCounts: z.record(z.number().int().nonnegative()),
  /** Ids that already exist on the target (would be replaced/skipped), per domain. */
  conflicts: z.record(z.array(z.string())).default({}),
  compat: SchemaCompatSchema,
  /** True when import is safe to proceed without forcing. */
  importable: z.boolean(),
});
export type ImportPreview = z.infer<typeof ImportPreviewSchema>;

/** Options for restoring an archive (Theme C consumes these). */
export const ImportOptionsSchema = z.object({
  /** `replace` overwrites conflicting ids; `merge` keeps existing, inserts new. */
  mode: z.enum(['replace', 'merge']).default('merge'),
  dryRun: z.boolean().default(false),
  /** Required to unwrap secrets from a `passphrase`-mode archive. */
  passphrase: z.string().min(1).optional(),
});
export type ImportOptions = z.infer<typeof ImportOptionsSchema>;

/** Outcome of a completed restore (Theme C): per-domain rows inserted/skipped. */
export const ImportResultSchema = z.object({
  ok: z.boolean(),
  mode: z.enum(['replace', 'merge']),
  /** Rows actually inserted per domain. */
  inserted: z.record(z.number().int().nonnegative()),
  /** Rows skipped per domain (merge: id already present; replace: 0). */
  skipped: z.record(z.number().int().nonnegative()).default({}),
  /** True when the post-restore search reindex succeeded (fail-open: false ⇒ reindex warned). */
  reindexed: z.boolean().default(false),
});
export type ImportResult = z.infer<typeof ImportResultSchema>;

/**
 * Compare an archive's schema version to the importing instance's. `ok` = same
 * shape (safe). `older-archive` = archive predates the target (forward-migratable,
 * still importable). `newer-archive` = archive came from a newer instance whose
 * schema this instance doesn't understand yet — NOT importable without upgrading.
 * Pure — the import service (Theme C) drives `ImportPreview` from it.
 */
export function compareSchemaVersion(archiveVersion: number, currentVersion: number): SchemaCompat {
  if (archiveVersion === currentVersion) return 'ok';
  return archiveVersion > currentVersion ? 'newer-archive' : 'older-archive';
}

/** Whether an archive at `compat` may be imported into this instance. */
export function isImportable(compat: SchemaCompat): boolean {
  return compat !== 'newer-archive';
}
