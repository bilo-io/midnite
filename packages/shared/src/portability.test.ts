import { describe, expect, it } from 'vitest';
import {
  ArchiveManifestSchema,
  BackupSummarySchema,
  ExportOptionsSchema,
  ImportOptionsSchema,
  ImportPreviewSchema,
  ImportResultSchema,
  SecretRecordSchema,
  compareSchemaVersion,
  domainPayloadSchema,
  isImportable,
} from './portability.js';
import { z } from 'zod';

describe('compareSchemaVersion', () => {
  it('equal versions are ok (importable)', () => {
    expect(compareSchemaVersion(66, 66)).toBe('ok');
    expect(isImportable('ok')).toBe(true);
  });

  it('an older archive is forward-migratable (importable)', () => {
    expect(compareSchemaVersion(60, 66)).toBe('older-archive');
    expect(isImportable('older-archive')).toBe(true);
  });

  it('a newer archive is not importable into this instance', () => {
    expect(compareSchemaVersion(70, 66)).toBe('newer-archive');
    expect(isImportable('newer-archive')).toBe(false);
  });
});

describe('Theme G — passphrase secrets contract', () => {
  it('a passphrase manifest carries KDF params; an excluded one omits them', () => {
    const base = { schemaVersion: 1, appVersion: '1.0.0', createdAt: 'now', domains: ['tasks'] };
    expect(ArchiveManifestSchema.parse({ ...base, secretsMode: 'excluded' }).kdf).toBeUndefined();
    const withKdf = ArchiveManifestSchema.parse({
      ...base,
      secretsMode: 'passphrase',
      kdf: { salt: 'c2FsdA==', N: 32768, r: 8, p: 1, keyLen: 32 },
    });
    expect(withKdf.kdf?.N).toBe(32768);
  });

  it('SecretRecord requires a non-empty blob + locator', () => {
    expect(SecretRecordSchema.safeParse({ table: 'webhooks', entityId: 'w1', field: 'secret', blob: 'p1:x' }).success).toBe(true);
    expect(SecretRecordSchema.safeParse({ table: 'webhooks', entityId: 'w1', field: 'secret', blob: '' }).success).toBe(false);
  });

  it('ImportPreview.warnings + ImportResult secret counts default to empty/0', () => {
    const preview = ImportPreviewSchema.parse({
      manifest: { schemaVersion: 1, appVersion: '1', createdAt: 'now', domains: [], secretsMode: 'excluded' },
      domainCounts: {}, compat: 'ok', importable: true,
    });
    expect(preview.warnings).toEqual([]);
    const res = ImportResultSchema.parse({ ok: true, mode: 'replace', inserted: {} });
    expect(res.secretsRestored).toBe(0);
    expect(res.secretsSkipped).toBe(0);
  });
});

describe('ExportOptions / ImportOptions defaults', () => {
  it('export defaults to excluding secrets', () => {
    expect(ExportOptionsSchema.parse({})).toMatchObject({ includeSecrets: false });
  });

  it('import defaults to a non-destructive merge dry-safe shape', () => {
    expect(ImportOptionsSchema.parse({})).toMatchObject({ mode: 'merge', dryRun: false });
  });
});

describe('ArchiveManifest + domain payload', () => {
  it('validates a manifest and rejects a bad secretsMode', () => {
    const manifest = {
      schemaVersion: 66,
      appVersion: '1.2.3',
      createdAt: '2026-07-03T00:00:00Z',
      domains: ['tasks', 'projects'],
      secretsMode: 'excluded' as const,
    };
    expect(ArchiveManifestSchema.parse(manifest)).toEqual(manifest);
    expect(ArchiveManifestSchema.safeParse({ ...manifest, secretsMode: 'plaintext' }).success).toBe(false);
  });

  it('domainPayloadSchema validates rows against the per-domain record schema', () => {
    const taskEnvelope = domainPayloadSchema(z.object({ id: z.string() }));
    expect(taskEnvelope.parse({ domain: 'tasks', count: 1, records: [{ id: 't1' }] }).count).toBe(1);
    expect(taskEnvelope.safeParse({ domain: 'tasks', count: 1, records: [{ id: 42 }] }).success).toBe(false);
  });
});

describe('BackupSummary (Phase 49 D)', () => {
  it('extends the manifest with per-domain counts', () => {
    const s = BackupSummarySchema.parse({
      schemaVersion: 68,
      appVersion: '0.1.0',
      createdAt: '2026-07-05T00:00:00.000Z',
      domains: ['tasks', 'notes'],
      secretsMode: 'excluded',
      counts: { tasks: 3, notes: 0 },
    });
    expect(s.counts.tasks).toBe(3);
  });

  it('rejects a non-numeric count', () => {
    expect(
      BackupSummarySchema.safeParse({
        schemaVersion: 1,
        appVersion: '0.1.0',
        createdAt: 'x',
        domains: [],
        secretsMode: 'excluded',
        counts: { tasks: 'lots' },
      }).success,
    ).toBe(false);
  });
});
