import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the fs surface auth-store uses so readAuth is deterministic (no real ~/.config).
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

import { readFile } from 'node:fs/promises';

import { envToken, readAuth, resolveToken } from './auth-store.js';

const readFileMock = vi.mocked(readFile);

const ENV_KEYS = ['MIDNITE_TOKEN', 'MIDNITE_AUTH_TOKEN'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  readFileMock.mockReset();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('envToken', () => {
  it('is undefined when neither env var is set', () => {
    expect(envToken()).toBeUndefined();
  });

  it('reads MIDNITE_TOKEN', () => {
    process.env['MIDNITE_TOKEN'] = 'tok-new';
    expect(envToken()).toBe('tok-new');
  });

  it('falls back to the MIDNITE_AUTH_TOKEN alias', () => {
    process.env['MIDNITE_AUTH_TOKEN'] = 'tok-legacy';
    expect(envToken()).toBe('tok-legacy');
  });

  it('prefers MIDNITE_TOKEN over the legacy alias', () => {
    process.env['MIDNITE_TOKEN'] = 'tok-new';
    process.env['MIDNITE_AUTH_TOKEN'] = 'tok-legacy';
    expect(envToken()).toBe('tok-new');
  });

  it('ignores an empty env var', () => {
    process.env['MIDNITE_TOKEN'] = '';
    process.env['MIDNITE_AUTH_TOKEN'] = 'tok-legacy';
    expect(envToken()).toBe('tok-legacy');
  });
});

describe('readAuth', () => {
  it('returns null when the file is absent (logged out)', async () => {
    readFileMock.mockRejectedValueOnce(Object.assign(new Error('nope'), { code: 'ENOENT' }));
    expect(await readAuth()).toBeNull();
  });

  it('parses a valid auth file', async () => {
    readFileMock.mockResolvedValueOnce(JSON.stringify({ accessToken: 'a', refreshToken: 'r' }));
    expect(await readAuth()).toEqual({ accessToken: 'a', refreshToken: 'r' });
  });

  it('degrades a corrupt file to null AND warns on stderr (not silent — SW-4)', async () => {
    readFileMock.mockResolvedValueOnce('{ not json');
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    expect(await readAuth()).toBeNull();
    expect(err).toHaveBeenCalledWith(expect.stringMatching(/unreadable.*midnite login/));
    err.mockRestore();
  });
});

describe('resolveToken', () => {
  it('prefers the stored JWT over env and flag', async () => {
    readFileMock.mockResolvedValueOnce(JSON.stringify({ accessToken: 'disk', refreshToken: 'r' }));
    process.env['MIDNITE_TOKEN'] = 'env';
    expect(await resolveToken('flag')).toBe('disk');
  });

  it('falls back to the env token when no file is stored', async () => {
    readFileMock.mockRejectedValueOnce(Object.assign(new Error('nope'), { code: 'ENOENT' }));
    process.env['MIDNITE_TOKEN'] = 'env';
    expect(await resolveToken('flag')).toBe('env');
  });

  it('falls back to the --token flag when neither disk nor env has one', async () => {
    readFileMock.mockRejectedValueOnce(Object.assign(new Error('nope'), { code: 'ENOENT' }));
    expect(await resolveToken('flag')).toBe('flag');
  });

  it('is undefined when nothing supplies a token', async () => {
    readFileMock.mockRejectedValueOnce(Object.assign(new Error('nope'), { code: 'ENOENT' }));
    expect(await resolveToken(undefined)).toBeUndefined();
  });
});
