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
 * KDF parameters for a `passphrase`-mode archive (Theme G). A **single** random
 * salt + scrypt cost params live in the manifest; every re-wrapped secret derives
 * one key from `(passphrase, salt, params)` on import — one KDF run, not one per
 * secret. Present only when `secretsMode === 'passphrase'`.
 */
export const KdfParamsSchema = z.object({
  /** base64-encoded random salt. */
  salt: z.string().min(1),
  /** scrypt cost (CPU/memory) — a power of two. */
  N: z.number().int().positive(),
  /** scrypt block size. */
  r: z.number().int().positive(),
  /** scrypt parallelization. */
  p: z.number().int().positive(),
  /** derived key length in bytes (32 for AES-256). */
  keyLen: z.number().int().positive(),
});
export type KdfParams = z.infer<typeof KdfParamsSchema>;

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
  /** Present iff `secretsMode === 'passphrase'` — the KDF for the `secrets` payload. */
  kdf: KdfParamsSchema.optional(),
});
export type ArchiveManifest = z.infer<typeof ArchiveManifestSchema>;

/** Fixed archive-domain name carrying re-wrapped secrets (Theme G). Kept separate
 *  from the work domains so secret-free payloads stay byte-identical to today. */
export const SECRETS_DOMAIN = 'secrets';

/**
 * One re-wrapped secret in the `secrets` payload (Theme G). Locates the field by
 * `{table, entityId, field}` and carries the passphrase-wrapped ciphertext (`blob`).
 * On import the blob is unwrapped with the passphrase key, then **re-encrypted**
 * under the target instance's `MIDNITE_SECRET_KEY` before it touches the column —
 * raw per-instance blobs never travel (the export key can't decrypt them elsewhere).
 */
export const SecretRecordSchema = z.object({
  table: z.string(),
  entityId: z.string(),
  field: z.string(),
  blob: z.string().min(1),
});
export type SecretRecord = z.infer<typeof SecretRecordSchema>;

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
 * The portable domains a backup carries + a human label, for a display-only
 * "what's included" summary (Phase 49 E). The secret-free *work* domains, plus
 * (Theme G) users/teams and the secret-bearing integration domains — their
 * config always rides along; the secret material only under `passphrase` mode.
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
  { name: 'users', label: 'Users & profiles' },
  { name: 'teams', label: 'Teams & memberships' },
  { name: 'llmProviders', label: 'LLM providers' },
  { name: 'webhooks', label: 'Webhooks' },
  { name: 'workflowCredentials', label: 'Workflow credentials' },
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
  /** Human-readable heads-up before restoring (Theme G): a `replace` that carries
   *  users signs you out; a `passphrase` archive needs the passphrase / a target
   *  key to restore its secrets. Advisory — they don't block `importable`. */
  warnings: z.array(z.string()).default([]),
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
  /** Secrets re-encrypted under this instance's key + written (Theme G). */
  secretsRestored: z.number().int().nonnegative().default(0),
  /** Secrets skipped — no passphrase given, or no `MIDNITE_SECRET_KEY` to re-encrypt under. */
  secretsSkipped: z.number().int().nonnegative().default(0),
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
