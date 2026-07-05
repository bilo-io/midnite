import { unzipSync, zipSync } from 'fflate';
import {
  ArchiveManifestSchema,
  DomainPayloadSchema,
  type ArchiveManifest,
  type DomainPayload,
} from '@midnite/shared';

/**
 * Phase 49 B — the archive container. A zip with `manifest.json` at the root and
 * one JSON payload per domain under `domains/<name>.json` (the format decided in
 * Theme A). Pure functions over Buffers so both the export service and the
 * (Theme C) importer share one pack/unpack. Buffered, not streamed — a single
 * store is small; revisit if archives grow.
 */

const MANIFEST_FILE = 'manifest.json';
const DOMAIN_DIR = 'domains';

const enc = (obj: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(obj, null, 2));

// A fixed zip mtime (zip epoch starts at 1980, so 0 is invalid) → deterministic
// archives: the same store packs to byte-identical bytes, keeping tests stable.
const FIXED_MTIME = new Date('2020-01-01T00:00:00Z');

/** Pack a manifest + per-domain payloads into a zip Buffer. */
export function packArchive(manifest: ArchiveManifest, domains: DomainPayload[]): Buffer {
  const files: Record<string, Uint8Array> = { [MANIFEST_FILE]: enc(manifest) };
  for (const d of domains) files[`${DOMAIN_DIR}/${d.domain}.json`] = enc(d);
  return Buffer.from(zipSync(files, { mtime: FIXED_MTIME }));
}

/** Unpack a zip Buffer back into a validated manifest + domain payloads (Theme C). */
export function unpackArchive(buf: Buffer): { manifest: ArchiveManifest; domains: DomainPayload[] } {
  const files = unzipSync(new Uint8Array(buf));
  const manifestRaw = files[MANIFEST_FILE];
  if (!manifestRaw) throw new Error('archive missing manifest.json');
  const manifest = ArchiveManifestSchema.parse(JSON.parse(new TextDecoder().decode(manifestRaw)));
  const domains: DomainPayload[] = [];
  for (const name of manifest.domains) {
    const raw = files[`${DOMAIN_DIR}/${name}.json`];
    if (!raw) throw new Error(`archive missing domains/${name}.json declared in the manifest`);
    domains.push(DomainPayloadSchema.parse(JSON.parse(new TextDecoder().decode(raw))) as DomainPayload);
  }
  return { manifest, domains };
}
