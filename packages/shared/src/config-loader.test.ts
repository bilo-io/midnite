import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { enabledSsoProviders, OperatorConfigSchema, parseConfig } from './config.js';
import {
  deepMerge,
  findConfigPath,
  loadConfig,
  loadConfigFromFile,
  loadOperatorConfig,
  OperatorAuthInUserConfigError,
  OPERATOR_CONFIG_ENV,
} from './config-loader.js';

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
    // Phase 59 D — chat-to-board prefers a local model by default (never a surprise bill).
    expect(config.chat.preferLocal).toBe(true);
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

// Phase 72 — operator config split. Every test writes the user midnite.json at
// `root` and (optionally) an operator file under `root/.midnite/`; the operator
// env override is saved/restored so tests don't leak into each other.
describe('operator config (Phase 72)', () => {
  const savedEnv = process.env[OPERATOR_CONFIG_ENV];
  beforeEach(() => {
    delete process.env[OPERATOR_CONFIG_ENV];
  });
  afterEach(() => {
    if (savedEnv === undefined) delete process.env[OPERATOR_CONFIG_ENV];
    else process.env[OPERATOR_CONFIG_ENV] = savedEnv;
  });

  const writeUser = () => {
    const p = join(root, 'midnite.json');
    writeFileSync(p, VALID_CONFIG);
    return p;
  };
  const writeOperator = (obj: unknown, dir = join(root, '.midnite')) => {
    mkdirSync(dir, { recursive: true });
    const p = join(dir, 'operator.json');
    writeFileSync(p, JSON.stringify(obj));
    return p;
  };

  describe('deepMerge', () => {
    it('recursively merges plain objects; override arrays/scalars win', () => {
      expect(deepMerge({ a: { x: 1, y: 2 } }, { a: { y: 9 } })).toEqual({ a: { x: 1, y: 9 } });
      expect(deepMerge({ l: [1, 2] }, { l: [3] })).toEqual({ l: [3] });
      expect(deepMerge({ a: 1 }, undefined)).toBeUndefined();
    });
  });

  describe('loadOperatorConfig', () => {
    it('returns null when the default file is absent (auth stays off)', () => {
      expect(loadOperatorConfig(root)).toBeNull();
    });

    it('throws when an explicit MIDNITE_OPERATOR_CONFIG path is missing (fail-closed)', () => {
      process.env[OPERATOR_CONFIG_ENV] = join(root, 'nope', 'operator.json');
      expect(() => loadOperatorConfig(root)).toThrow(/not found/);
    });

    it('throws on unparseable JSON (fail-closed)', () => {
      mkdirSync(join(root, '.midnite'), { recursive: true });
      writeFileSync(join(root, '.midnite', 'operator.json'), '{ broken');
      expect(() => loadOperatorConfig(root)).toThrow(/valid JSON/);
    });

    it('throws on an invalid shape (fail-closed)', () => {
      writeOperator({ gateway: { auth: { allowlist: 'not-an-array' } } });
      expect(() => loadOperatorConfig(root)).toThrow();
    });

    it('prefers the explicit env path over the default file', () => {
      writeOperator({ gateway: { auth: { allowlist: ['default@x.com'] } } });
      const explicit = join(root, 'ops.json');
      writeFileSync(explicit, JSON.stringify({ gateway: { auth: { allowlist: ['env@x.com'] } } }));
      process.env[OPERATOR_CONFIG_ENV] = explicit;
      expect(loadOperatorConfig(root)).toEqual({ gateway: { auth: { allowlist: ['env@x.com'] } } });
    });
  });

  describe('loadConfig deep-merges the operator auth', () => {
    it('layers gateway.auth from the operator file into the resolved config', () => {
      const p = writeUser();
      writeOperator({
        gateway: {
          auth: {
            allowlist: ['ops@x.com'],
            sso: { github: { clientId: 'gh-id', clientSecretEnv: 'GH_SECRET' } },
          },
        },
      });
      const config = loadConfig(p);
      expect(config.gateway.auth.allowlist).toEqual(['ops@x.com']);
      expect(enabledSsoProviders(config)).toEqual(['github']);
    });

    it('produces a MidniteConfig byte-equal to the pre-split inline form', () => {
      const p = writeUser();
      writeOperator({ gateway: { auth: { allowlist: ['ops@x.com'] } } });
      const split = loadConfig(p);
      const inline = parseConfig({
        agent: {},
        terminal: {},
        gateway: { auth: { allowlist: ['ops@x.com'] } },
      });
      expect(split).toEqual(inline);
    });

    it('with no operator file yields the auth-off baseline (unchanged from today)', () => {
      const p = writeUser();
      const config = loadConfig(p);
      expect(config.gateway.auth.allowlist).toEqual([]);
      expect(enabledSsoProviders(config)).toEqual([]);
      expect(config.gateway.auth.jwt.secretEnv).toBe('MIDNITE_JWT_SECRET');
    });
  });

  describe('fail-closed: gateway.auth may not live in midnite.json', () => {
    it('throws OperatorAuthInUserConfigError when gateway.auth has keys', () => {
      const p = join(root, 'midnite.json');
      writeFileSync(p, JSON.stringify({ agent: {}, terminal: {}, gateway: { auth: { allowlist: [] } } }));
      expect(() => loadConfig(p)).toThrow(OperatorAuthInUserConfigError);
    });

    it('throws even for an empty gateway.auth ({})', () => {
      const p = join(root, 'midnite.json');
      writeFileSync(p, JSON.stringify({ agent: {}, terminal: {}, gateway: { auth: {} } }));
      expect(() => loadConfig(p)).toThrow(/operator-owned/);
    });

    it('names the offending key in the remedy message', () => {
      const p = join(root, 'midnite.json');
      writeFileSync(p, JSON.stringify({ agent: {}, terminal: {}, gateway: { auth: {} } }));
      expect(() => loadConfig(p)).toThrow(/gateway\.auth/);
    });

    it('loadConfigFromFile enforces the same boundary', () => {
      const p = join(root, 'midnite.json');
      writeFileSync(p, JSON.stringify({ agent: {}, terminal: {}, gateway: { auth: {} } }));
      expect(() => loadConfigFromFile(p)).toThrow(OperatorAuthInUserConfigError);
    });
  });

  describe('the committed operator.example.json', () => {
    it('parses against OperatorConfigSchema (guards against sample drift)', () => {
      // The example sits beside the repo-root midnite.json; walk up to find it
      // (import.meta isn't available under the shared package's tsconfig module).
      const repoConfig = findConfigPath();
      expect(repoConfig).not.toBeNull();
      const examplePath = join(dirname(repoConfig!), '.midnite', 'operator.example.json');
      const raw = JSON.parse(readFileSync(examplePath, 'utf-8'));
      expect(() => OperatorConfigSchema.parse(raw)).not.toThrow();
      const parsed = OperatorConfigSchema.parse(raw);
      // Sanity: it advertises both providers + an allowlist so operators see the shape.
      expect(parsed.gateway.auth.sso?.google?.clientId).toBeTruthy();
      expect(parsed.gateway.auth.sso?.github?.clientId).toBeTruthy();
      // Phase 72 E/F — the sample pins per-provider redirect URIs + JWT + allowlist so
      // an operator sees every field they must fill (and the redirectUri go-live footgun).
      expect(parsed.gateway.auth.sso?.google?.redirectUri).toContain('/auth/sso/google/callback');
      expect(parsed.gateway.auth.sso?.github?.redirectUri).toContain('/auth/sso/github/callback');
      expect(parsed.gateway.auth.jwt.secretEnv).toBe('MIDNITE_JWT_SECRET');
      expect(parsed.gateway.auth.allowlist.length).toBeGreaterThan(0);
    });
  });
});
