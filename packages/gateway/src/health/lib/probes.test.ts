import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { commandExists, dirWritable, pathExists } from './probes';

const tmp = mkdtempSync(join(tmpdir(), 'midnite-probes-'));

afterAll(() => {
  // best-effort; the OS temp dir is cleaned anyway
});

describe('commandExists', () => {
  it('finds an executable placed on a fake PATH', () => {
    const bin = join(tmp, 'faketool');
    writeFileSync(bin, '#!/bin/sh\n');
    chmodSync(bin, 0o755);
    expect(commandExists('faketool', { PATH: tmp })).toBe(true);
  });

  it('is false for a name absent from PATH', () => {
    expect(commandExists('definitely-not-a-real-binary-xyz', { PATH: tmp })).toBe(false);
  });

  it('checks an absolute path directly (ignores PATH)', () => {
    const bin = join(tmp, 'abs-tool');
    writeFileSync(bin, '#!/bin/sh\n');
    chmodSync(bin, 0o755);
    expect(commandExists(bin, { PATH: '' })).toBe(true);
  });
});

describe('dirWritable / pathExists', () => {
  it('reports a writable temp dir', () => {
    expect(dirWritable(tmp)).toBe(true);
    expect(pathExists(tmp)).toBe(true);
  });

  it('is false for a missing path', () => {
    expect(dirWritable(join(tmp, 'nope'))).toBe(false);
    expect(pathExists(join(tmp, 'nope'))).toBe(false);
  });
});
