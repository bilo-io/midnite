import { describe, expect, it } from 'vitest';
import {
  ArchiveManifestSchema,
  ExportOptionsSchema,
  ImportOptionsSchema,
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
