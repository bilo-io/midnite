import { describe, expect, it } from 'vitest';
import {
  VersionManifestSchema,
  isBelowFloor,
  isUpdateAvailable,
  versionManifestFile,
} from './update.js';

describe('versionManifestFile', () => {
  it('maps each channel to its manifest filename (Phase 71 H)', () => {
    expect(versionManifestFile('stable')).toBe('version.json');
    expect(versionManifestFile('beta')).toBe('version.beta.json');
  });
});

describe('isUpdateAvailable', () => {
  it('is true when latest is strictly newer', () => {
    expect(isUpdateAvailable('0.1.3', '0.1.4')).toBe(true);
    expect(isUpdateAvailable('0.1.3', '0.2.0')).toBe(true);
    expect(isUpdateAvailable('0.9.9', '1.0.0')).toBe(true);
  });

  it('is false when equal or ahead', () => {
    expect(isUpdateAvailable('0.1.3', '0.1.3')).toBe(false);
    expect(isUpdateAvailable('0.2.0', '0.1.9')).toBe(false);
    expect(isUpdateAvailable('1.0.0', '0.9.9')).toBe(false);
  });

  it('throws on a malformed version', () => {
    expect(() => isUpdateAvailable('0.1', '0.1.0')).toThrow();
    expect(() => isUpdateAvailable('x', '0.1.0')).toThrow();
  });
});

describe('isBelowFloor', () => {
  it('is true when current is below minSupported', () => {
    expect(isBelowFloor('0.1.3', '0.2.0')).toBe(true);
  });

  it('is false at or above the floor', () => {
    expect(isBelowFloor('0.2.0', '0.2.0')).toBe(false);
    expect(isBelowFloor('0.3.0', '0.2.0')).toBe(false);
  });

  it('is false when no floor is set', () => {
    expect(isBelowFloor('0.1.3')).toBe(false);
    expect(isBelowFloor('0.1.3', undefined)).toBe(false);
  });
});

describe('VersionManifestSchema', () => {
  it('parses a minimal manifest and defaults the channel', () => {
    const m = VersionManifestSchema.parse({ version: '0.1.4' });
    expect(m).toEqual({ version: '0.1.4', channel: 'stable' });
  });

  it('parses a full manifest', () => {
    const m = VersionManifestSchema.parse({
      version: '0.2.0',
      channel: 'beta',
      minSupported: '0.1.0',
      releasedAt: '2026-07-18T00:00:00.000Z',
      notesUrl: 'https://example.com/notes',
    });
    expect(m.channel).toBe('beta');
    expect(m.minSupported).toBe('0.1.0');
  });

  it('rejects a non-semver version', () => {
    expect(() => VersionManifestSchema.parse({ version: '1.2' })).toThrow();
    expect(() => VersionManifestSchema.parse({ version: 'latest' })).toThrow();
  });

  it('rejects an unknown channel', () => {
    expect(() =>
      VersionManifestSchema.parse({ version: '0.1.4', channel: 'nightly' }),
    ).toThrow();
  });
});
