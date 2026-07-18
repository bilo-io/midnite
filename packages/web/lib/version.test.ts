import { describe, expect, it } from 'vitest';

import { VERSION_MANIFEST_PATH, versionManifestPath } from './version';

describe('versionManifestPath', () => {
  it('maps each channel to its same-origin manifest path (Phase 71 H)', () => {
    expect(versionManifestPath('stable')).toBe('/version.json');
    expect(versionManifestPath('beta')).toBe('/version.beta.json');
  });

  it('keeps the stable path aligned with VERSION_MANIFEST_PATH', () => {
    expect(versionManifestPath('stable')).toBe(VERSION_MANIFEST_PATH);
  });
});
