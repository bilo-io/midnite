import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findConfigPath, loadConfig, loadConfigFromFile } from './config-loader.js';

// A minimal but valid midnite.json: agent/terminal/gateway are required objects
// (each fills its own defaults), so an empty `{}` would NOT validate.
const VALID_CONFIG = JSON.stringify({ agent: {}, terminal: {}, gateway: {} });

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'midnite-cfg-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('findConfigPath', () => {
  it('walks up from a nested dir to find an ancestor midnite.json', () => {
    const configPath = join(root, 'midnite.json');
    writeFileSync(configPath, VALID_CONFIG);
    const nested = join(root, 'packages', 'gateway', 'src');
    mkdirSync(nested, { recursive: true });
    expect(findConfigPath(nested)).toBe(configPath);
  });

  it('returns null when no midnite.json exists up the tree', () => {
    const lonely = join(root, 'no', 'config', 'here');
    mkdirSync(lonely, { recursive: true });
    expect(findConfigPath(lonely)).toBeNull();
  });
});

describe('loadConfigFromFile', () => {
  it('parses a valid file and fills schema defaults', () => {
    const p = join(root, 'midnite.json');
    writeFileSync(p, VALID_CONFIG);
    const config = loadConfigFromFile(p);
    expect(config.agent.pool).toBe(4);
    expect(config.terminal.mode).toBe('pty');
  });

  it('throws on unparseable JSON', () => {
    const p = join(root, 'midnite.json');
    writeFileSync(p, '{ not json');
    expect(() => loadConfigFromFile(p)).toThrow();
  });
});

describe('loadConfig', () => {
  it('parses the file at an explicit path', () => {
    const p = join(root, 'midnite.json');
    writeFileSync(p, VALID_CONFIG);
    expect(loadConfig(p).agent.pool).toBe(4);
  });

  it('falls back to schema defaults when the explicit path is missing', () => {
    const config = loadConfig(join(root, 'does-not-exist.json'));
    expect(config.agent.pool).toBe(4);
    expect(config.repos).toEqual([]);
  });

  it('falls back to schema defaults when the file is unparseable', () => {
    const p = join(root, 'midnite.json');
    writeFileSync(p, 'garbage{{');
    expect(loadConfig(p).agent.pool).toBe(4);
  });
});
