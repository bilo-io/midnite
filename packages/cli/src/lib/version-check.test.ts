import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VersionManifest } from '@midnite/shared';

import { getVersion } from './brand.js';
import { setJsonMode } from './output.js';
import {
  buildNotice,
  CACHE_FILE,
  DEFAULT_VERSION_URL,
  isSuppressed,
  maybeNotifyOutOfDate,
  renderNotice,
  versionCheckUrl,
} from './version-check.js';

const manifest = (over: Partial<VersionManifest>): VersionManifest => ({
  version: '9.9.9',
  channel: 'stable',
  ...over,
});

function seedCache(m: VersionManifest, fetchedAt = Date.now()): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt, manifest: m }));
}

afterEach(() => {
  setJsonMode(false);
  delete process.env['MIDNITE_NO_UPDATE_CHECK'];
  delete process.env['MIDNITE_VERSION_URL'];
  try {
    fs.rmSync(CACHE_FILE);
  } catch {
    // no cache to clear
  }
  vi.restoreAllMocks();
});

describe('buildNotice', () => {
  it('returns a floor notice when below minSupported', () => {
    const n = buildNotice('0.1.0', manifest({ version: '0.3.0', minSupported: '0.2.0' }));
    expect(n?.level).toBe('floor');
    expect(n?.message).toMatch(/minimum supported/i);
  });

  it('returns a behind notice when merely out of date', () => {
    const n = buildNotice('0.1.0', manifest({ version: '0.2.0' }));
    expect(n?.level).toBe('behind');
    expect(n?.message).toMatch(/behind v0\.2\.0/);
  });

  it('returns null when up to date', () => {
    expect(buildNotice('0.2.0', manifest({ version: '0.2.0' }))).toBeNull();
    expect(buildNotice('0.3.0', manifest({ version: '0.2.0' }))).toBeNull();
  });

  it('prefers the floor notice over the behind notice', () => {
    const n = buildNotice('0.1.0', manifest({ version: '0.9.0', minSupported: '0.5.0' }));
    expect(n?.level).toBe('floor');
  });
});

describe('renderNotice', () => {
  it('renders both levels to a non-empty string', () => {
    expect(renderNotice({ level: 'floor', message: 'x' })).toContain('x');
    expect(renderNotice({ level: 'behind', message: 'y' })).toContain('y');
  });
});

describe('versionCheckUrl', () => {
  it('defaults to the GitHub-raw manifest, honouring the env override', () => {
    expect(versionCheckUrl()).toBe(DEFAULT_VERSION_URL);
    process.env['MIDNITE_VERSION_URL'] = 'https://example.test/v.json';
    expect(versionCheckUrl()).toBe('https://example.test/v.json');
  });
});

describe('isSuppressed', () => {
  it('is suppressed by the env var, the flag, or json mode', () => {
    expect(isSuppressed(['node', 'midnite', 'list'])).toBe(false);
    expect(isSuppressed(['node', 'midnite', '--no-update-check'])).toBe(true);
    process.env['MIDNITE_NO_UPDATE_CHECK'] = '1';
    expect(isSuppressed(['node', 'midnite', 'list'])).toBe(true);
    delete process.env['MIDNITE_NO_UPDATE_CHECK'];
    setJsonMode(true);
    expect(isSuppressed(['node', 'midnite', 'list'])).toBe(true);
  });
});

describe('maybeNotifyOutOfDate', () => {
  it('writes a stderr notice when the cached manifest is ahead', async () => {
    seedCache(manifest({ version: '99.0.0' }));
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    await maybeNotifyOutOfDate();
    expect(write).toHaveBeenCalledOnce();
    expect(String(write.mock.calls[0]![0])).toMatch(/behind v99\.0\.0/);
  });

  it('stays silent when the CLI is current', async () => {
    seedCache(manifest({ version: getVersion() }));
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    await maybeNotifyOutOfDate();
    expect(write).not.toHaveBeenCalled();
  });

  it('stays silent (and never fetches) when suppressed', async () => {
    process.env['MIDNITE_NO_UPDATE_CHECK'] = '1';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    await maybeNotifyOutOfDate();
    expect(write).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
