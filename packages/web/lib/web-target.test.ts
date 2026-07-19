import { describe, expect, it } from 'vitest';

import { resolveWebOutput, resolveWebTarget } from './web-target.mjs';

describe('resolveWebTarget', () => {
  it('defaults to static when unset', () => {
    expect(resolveWebTarget({})).toBe('static');
  });

  it('is static for an explicit static value', () => {
    expect(resolveWebTarget({ MIDNITE_WEB_TARGET: 'static' })).toBe('static');
  });

  it('is server for MIDNITE_WEB_TARGET=server (case-insensitive)', () => {
    expect(resolveWebTarget({ MIDNITE_WEB_TARGET: 'server' })).toBe('server');
    expect(resolveWebTarget({ MIDNITE_WEB_TARGET: 'SERVER' })).toBe('server');
  });

  it('treats an unknown value as static (safe default — never an accidental server build)', () => {
    expect(resolveWebTarget({ MIDNITE_WEB_TARGET: 'weird' })).toBe('static');
  });
});

describe('resolveWebOutput', () => {
  it("is 'export' for the default/static target (desktop parity)", () => {
    expect(resolveWebOutput({})).toBe('export');
    expect(resolveWebOutput({ MIDNITE_WEB_TARGET: 'static' })).toBe('export');
  });

  it('is undefined (Next server mode) for the server target', () => {
    expect(resolveWebOutput({ MIDNITE_WEB_TARGET: 'server' })).toBeUndefined();
  });
});
