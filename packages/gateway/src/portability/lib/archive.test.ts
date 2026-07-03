import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import type { ArchiveManifest, DomainPayload } from '@midnite/shared';
import { packArchive, unpackArchive } from './archive';

const manifest: ArchiveManifest = {
  schemaVersion: 68,
  appVersion: '0.1.0',
  createdAt: '2026-07-03T12:00:00.000Z',
  domains: ['tasks', 'notes'],
  secretsMode: 'excluded',
};
const domains: DomainPayload[] = [
  { domain: 'tasks', count: 1, records: [{ id: 't1', title: 'x' }] },
  { domain: 'notes', count: 0, records: [] },
];

describe('portability archive (Phase 49 B)', () => {
  it('packs a zip with manifest.json + domains/<name>.json', () => {
    const files = unzipSync(new Uint8Array(packArchive(manifest, domains)));
    expect(Object.keys(files).sort()).toEqual([
      'domains/notes.json',
      'domains/tasks.json',
      'manifest.json',
    ]);
  });

  it('round-trips through pack → unpack (manifest + payloads validated)', () => {
    const { manifest: m, domains: d } = unpackArchive(packArchive(manifest, domains));
    expect(m).toEqual(manifest);
    expect(d.find((x) => x.domain === 'tasks')?.records).toEqual([{ id: 't1', title: 'x' }]);
  });

  it('is deterministic — the same input packs to identical bytes', () => {
    expect(packArchive(manifest, domains).equals(packArchive(manifest, domains))).toBe(true);
  });

  it('rejects an archive missing its manifest', () => {
    const bogus = Buffer.from(new Uint8Array([1, 2, 3]));
    expect(() => unpackArchive(bogus)).toThrow();
  });

  it('rejects when a manifest-declared domain file is absent', () => {
    // manifest says [tasks, notes] but only pack tasks → notes missing.
    const partial = packArchive(manifest, [domains[0]!]);
    expect(() => unpackArchive(partial)).toThrow(/domains\/notes\.json/);
  });
});
