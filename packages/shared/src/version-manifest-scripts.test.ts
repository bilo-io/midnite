import { describe, expect, it } from 'vitest';

import { VersionManifestSchema } from './update.js';

// Test-only imports of the release-flow build scripts' pure helpers (Phase 71
// Theme G). The scripts are import-free at runtime (they run in `moon ci` / at
// release, before any build) and are NOT runtime deps of `shared`; they're pulled
// in here only to pin their output against the shared `VersionManifestSchema`
// contract so the emitter and the schema can't drift. Both scripts guard their
// `main()` behind an "invoked directly" check, so importing them runs no I/O.
import { buildManifest } from '../../../scripts/emit-version-manifest.mjs';
import { checkManifestFreshness } from '../../../scripts/version-check.mjs';

describe('emit-version-manifest · buildManifest', () => {
  it('produces a manifest that satisfies VersionManifestSchema', () => {
    const m = buildManifest({ version: '1.2.3', releasedAt: '2026-01-01T00:00:00.000Z' });
    expect(() => VersionManifestSchema.parse(m)).not.toThrow();
    expect(m).toMatchObject({
      version: '1.2.3',
      channel: 'stable',
      releasedAt: '2026-01-01T00:00:00.000Z',
      notesUrl: 'https://github.com/bilo-io/midnite-app/releases/tag/v1.2.3',
    });
  });

  it('defaults channel to stable and stamps a releasedAt timestamp', () => {
    const m = buildManifest({ version: '2.0.0' });
    expect(m.channel).toBe('stable');
    expect(typeof m.releasedAt).toBe('string');
    // The stamped timestamp must be a valid ISO datetime the schema accepts.
    expect(() => VersionManifestSchema.parse(m)).not.toThrow();
  });

  it('omits minSupported (the force-update floor is set by hand — Theme H)', () => {
    expect(buildManifest({ version: '2.0.0' })).not.toHaveProperty('minSupported');
  });

  it('throws on a non-semver version', () => {
    expect(() => buildManifest({ version: 'nope' })).toThrow(/MAJOR\.MINOR\.PATCH/);
  });
});

describe('version-check · checkManifestFreshness', () => {
  it('passes when the manifest version matches the web version', () => {
    expect(checkManifestFreshness({ version: '0.1.3', channel: 'stable' }, '0.1.3').ok).toBe(true);
  });

  it('fails a stale manifest (version behind the package)', () => {
    const r = checkManifestFreshness({ version: '0.1.2', channel: 'stable' }, '0.1.3');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/stale/);
  });

  it('fails a malformed version, bad channel, or non-object', () => {
    expect(checkManifestFreshness({ version: 'x', channel: 'stable' }, 'x').ok).toBe(false);
    expect(checkManifestFreshness({ version: '0.1.3', channel: 'nightly' }, '0.1.3').ok).toBe(false);
    expect(checkManifestFreshness(null, '0.1.3').ok).toBe(false);
  });

  it('accepts a manifest produced by buildManifest (no drift)', () => {
    const m = buildManifest({ version: '3.1.4' });
    expect(checkManifestFreshness(m, '3.1.4').ok).toBe(true);
  });
});
