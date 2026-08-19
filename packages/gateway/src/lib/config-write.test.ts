import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { persistConfigPatch, readConfigFile, resolveConfigWritePath } from './config-write';

let dir: string;
const ORIGINAL_ENV = process.env['MIDNITE_CONFIG_PATH'];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'midnite-config-write-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (ORIGINAL_ENV === undefined) delete process.env['MIDNITE_CONFIG_PATH'];
  else process.env['MIDNITE_CONFIG_PATH'] = ORIGINAL_ENV;
});

describe('resolveConfigWritePath', () => {
  it('prefers $MIDNITE_CONFIG_PATH — the packaged desktop app sets it', () => {
    const explicit = join(dir, 'somewhere', 'midnite.json');
    process.env['MIDNITE_CONFIG_PATH'] = explicit;
    expect(resolveConfigWritePath()).toBe(explicit);
  });

  it('falls back to ~/.midnite/midnite.json when no config exists above startDir', () => {
    // The fresh-install branch, and the one that actually matters: the desktop
    // app only passes MIDNITE_CONFIG_PATH when the file already exists, so on a
    // clean machine there is nothing to find. The write must still land where
    // the next boot reads. `dir` is an empty tmpdir with no midnite.json above it.
    delete process.env['MIDNITE_CONFIG_PATH'];
    expect(resolveConfigWritePath(dir)).toBe(join(homedir(), '.midnite', 'midnite.json'));
  });

  it('prefers an existing midnite.json found above startDir over the home fallback', () => {
    delete process.env['MIDNITE_CONFIG_PATH'];
    const found = join(dir, 'midnite.json');
    writeFileSync(found, '{}', 'utf8');
    expect(resolveConfigWritePath(dir)).toBe(found);
  });

  it('ignores an empty $MIDNITE_CONFIG_PATH rather than writing to ""', () => {
    // GitHub-style empty-string expansion is a real footgun elsewhere in this
    // repo (an empty CSC_LINK once broke the macOS release), so treat "" as unset.
    process.env['MIDNITE_CONFIG_PATH'] = '';
    expect(resolveConfigWritePath(dir)).toBe(join(homedir(), '.midnite', 'midnite.json'));
  });
});

describe('readConfigFile', () => {
  it('returns {} for a missing file', () => {
    expect(readConfigFile(join(dir, 'nope.json'))).toEqual({});
  });

  it('degrades to {} on malformed JSON rather than throwing', () => {
    const path = join(dir, 'midnite.json');
    writeFileSync(path, '{ not json', 'utf8');
    expect(readConfigFile(path)).toEqual({});
  });

  it('degrades to {} when the file holds a non-object', () => {
    const path = join(dir, 'midnite.json');
    writeFileSync(path, '[1, 2, 3]', 'utf8');
    expect(readConfigFile(path)).toEqual({});
  });
});

describe('persistConfigPatch', () => {
  it('creates the file and its directory when absent', () => {
    const path = join(dir, 'nested', 'midnite.json');
    persistConfigPatch(path, { agent: { pool: 4, poolEnabled: true } });

    expect(existsSync(path)).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      agent: { pool: 4, poolEnabled: true },
    });
  });

  it('merges into an existing file without dropping unrelated settings', () => {
    const path = join(dir, 'midnite.json');
    writeFileSync(
      path,
      JSON.stringify({
        agent: { pool: 2, poolEnabled: false, maxPerRepo: 3 },
        repos: [{ name: 'midnite', path: '~/Dev/midnite' }],
        terminal: { mode: 'tmux' },
      }),
      'utf8',
    );

    persistConfigPatch(path, { agent: { pool: 8, poolEnabled: true } });

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      // the two patched keys change...
      agent: { pool: 8, poolEnabled: true, maxPerRepo: 3 },
      // ...and everything else survives, including sibling keys under `agent`.
      repos: [{ name: 'midnite', path: '~/Dev/midnite' }],
      terminal: { mode: 'tmux' },
    });
  });

  it('writes pretty, newline-terminated JSON so the file stays hand-editable', () => {
    const path = join(dir, 'midnite.json');
    persistConfigPatch(path, { agent: { pool: 1, poolEnabled: false } });

    const raw = readFileSync(path, 'utf8');
    expect(raw).toContain('\n  "agent"');
    expect(raw.endsWith('\n')).toBe(true);
  });

  it('overwrites a malformed file rather than losing the write', () => {
    const path = join(dir, 'midnite.json');
    writeFileSync(path, 'not json at all', 'utf8');

    persistConfigPatch(path, { agent: { poolEnabled: true } });

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ agent: { poolEnabled: true } });
  });
});
