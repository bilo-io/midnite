import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type PreflightCheck } from '@midnite/shared';
import type { DbFactory } from '../db/db.module';
import type { AgentPoolService } from '../pool/agent-pool.service';
import type { AgentPoolScheduler } from '../pool/agent-pool-scheduler.service';

// Deterministic env probes — each test dials the presence of claude/gh/tmux etc.
vi.mock('./lib/probes', () => ({
  commandExists: vi.fn(() => true),
  dirWritable: vi.fn(() => true),
  pathExists: vi.fn(() => true),
  nodePtyLoads: vi.fn(() => true),
}));

import * as probes from './lib/probes';
import { HealthService } from './health.service';

const mocked = probes as unknown as {
  commandExists: ReturnType<typeof vi.fn>;
  nodePtyLoads: ReturnType<typeof vi.fn>;
  pathExists: ReturnType<typeof vi.fn>;
};

// A valid config file so checkConfig() is deterministically 'ok'.
let configPath: string;
beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'midnite-health-'));
  configPath = join(dir, 'midnite.json');
  writeFileSync(configPath, JSON.stringify({ agent: {}, terminal: {}, gateway: {} }));
});

function config(
  overrides: Partial<{
    poolEnabled: boolean;
    mode: 'pty' | 'tmux';
    repos: { name: string; path: string }[];
    sso: unknown;
  }> = {},
): MidniteConfig {
  return parseConfig({
    agent: { poolEnabled: overrides.poolEnabled ?? false },
    terminal: { mode: overrides.mode ?? 'pty' },
    gateway: overrides.sso ? { auth: { sso: overrides.sso } } : {},
    repos: overrides.repos ?? [],
  });
}

const okSqlite = {
  prepare: (sql: string) => ({
    get: () => (sql.includes('sqlite_master') ? { name: 'tasks' } : { 1: 1 }),
  }),
};
function dbFactory(sqlite: unknown): DbFactory {
  return { get sqlite() { return sqlite; } } as unknown as DbFactory;
}
const pool = { capacity: () => 4, freeSlotCount: () => 2 } as unknown as AgentPoolService;

function svc(
  cfg: MidniteConfig,
  sqlite: unknown = okSqlite,
  scheduler?: Partial<AgentPoolScheduler>,
) {
  return new HealthService(cfg, dbFactory(sqlite), pool, scheduler as AgentPoolScheduler | undefined);
}

beforeEach(() => {
  process.env['MIDNITE_CONFIG_PATH'] = configPath;
  vi.mocked(mocked.commandExists).mockReturnValue(true);
  vi.mocked(mocked.nodePtyLoads).mockReturnValue(true);
  vi.mocked(mocked.pathExists).mockReturnValue(true);
});
afterEach(() => {
  delete process.env['MIDNITE_CONFIG_PATH'];
  delete process.env['MIDNITE_SECRET_KEY'];
});

function byName(checks: PreflightCheck[], name: string): PreflightCheck {
  return checks.find((c) => c.name === name)!;
}

describe('HealthService.bootChecks', () => {
  it('all green when every probe passes and a secret key is set', async () => {
    process.env['MIDNITE_SECRET_KEY'] = 'a'.repeat(64); // valid hex
    const checks = await svc(config()).bootChecks();
    const names = checks.map((c) => c.name).sort();
    expect(names).toEqual([
      'agent-cli',
      'config',
      'database',
      'gh-cli',
      'repo-paths',
      'secret-key',
      'spawner',
      'sso',
    ]);
    expect(checks.every((c) => c.status === 'ok')).toBe(true);
  });

  it('secret-key warns when unset, fails when malformed', async () => {
    expect(byName(await svc(config()).bootChecks(), 'secret-key').status).toBe('warn');
    process.env['MIDNITE_SECRET_KEY'] = 'too-short';
    expect(byName(await svc(config()).bootChecks(), 'secret-key').status).toBe('fail');
  });

  describe('sso (Phase 70 E)', () => {
    const GOOGLE = { clientId: 'g', clientSecretEnv: 'SSO_GOOGLE_SECRET' };
    afterEach(() => {
      delete process.env['SSO_GOOGLE_SECRET'];
      delete process.env['MIDNITE_JWT_SECRET'];
    });

    it('is ok when no providers are configured', async () => {
      expect(byName(await svc(config()).bootChecks(), 'sso').status).toBe('ok');
    });

    it('fails closed when a configured provider secret env is unset', async () => {
      const check = byName(await svc(config({ sso: { google: GOOGLE } })).bootChecks(), 'sso');
      expect(check.status).toBe('fail');
      expect(check.detail).toContain('SSO_GOOGLE_SECRET');
    });

    it('warns when secrets are present but JWT is disabled', async () => {
      process.env['SSO_GOOGLE_SECRET'] = 'shh';
      expect(byName(await svc(config({ sso: { google: GOOGLE } })).bootChecks(), 'sso').status).toBe(
        'warn',
      );
    });

    it('is ok when secrets and JWT are both set', async () => {
      process.env['SSO_GOOGLE_SECRET'] = 'shh';
      process.env['MIDNITE_JWT_SECRET'] = 'jwt';
      expect(byName(await svc(config({ sso: { google: GOOGLE } })).bootChecks(), 'sso').status).toBe(
        'ok',
      );
    });
  });

  it('missing agent CLI warns when the pool is off but fails when on', async () => {
    vi.mocked(mocked.commandExists).mockImplementation((cmd: string) => cmd !== 'claude');
    expect(byName(await svc(config({ poolEnabled: false })).bootChecks(), 'agent-cli').status).toBe('warn');
    expect(byName(await svc(config({ poolEnabled: true })).bootChecks(), 'agent-cli').status).toBe('fail');
  });

  it('missing gh only warns', async () => {
    vi.mocked(mocked.commandExists).mockImplementation((cmd: string) => cmd !== 'gh');
    expect(byName(await svc(config()).bootChecks(), 'gh-cli').status).toBe('warn');
  });

  it('flags missing configured repo paths as a warning', async () => {
    vi.mocked(mocked.pathExists).mockReturnValue(false);
    const check = byName(await svc(config({ repos: [{ name: 'app', path: '/nope' }] })).bootChecks(), 'repo-paths');
    expect(check.status).toBe('warn');
    expect(check.detail).toContain('app');
  });

  it('pty spawner unavailable fails only when the pool is enabled', async () => {
    vi.mocked(mocked.nodePtyLoads).mockReturnValue(false);
    expect(byName(await svc(config({ poolEnabled: false })).bootChecks(), 'spawner').status).toBe('warn');
    expect(byName(await svc(config({ poolEnabled: true })).bootChecks(), 'spawner').status).toBe('fail');
  });

  it('database fails when the handle throws (unwritable)', async () => {
    const throwing = { get sqlite() { throw new Error('SQLITE_CANTOPEN'); } };
    const check = byName(await svc(config(), throwing).bootChecks(), 'database');
    expect(check.status).toBe('fail');
  });

  it('database fails when core tables are missing (migrations not applied)', async () => {
    const noTables = { prepare: () => ({ get: () => undefined }) };
    const check = byName(await svc(config(), noTables).bootChecks(), 'database');
    expect(check.status).toBe('fail');
    expect(check.detail).toContain('migrations');
  });
});

describe('HealthService.readiness', () => {
  it('is ready when DB is live and the pool is disabled (scheduler not intended)', async () => {
    const r = await svc(config({ poolEnabled: false })).readiness();
    expect(r.ready).toBe(true);
    expect(byName(r.checks, 'scheduler').status).toBe('ok');
    expect(r.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('is not ready (503-worthy) when the DB is unreachable', async () => {
    const throwing = { get sqlite() { throw new Error('gone'); } };
    const r = await svc(config(), throwing).readiness();
    expect(r.ready).toBe(false);
    expect(r.worst).toBe('fail');
  });

  it('fails readiness when the pool is enabled but the scheduler is not running', async () => {
    const r = await svc(config({ poolEnabled: true }), okSqlite, { isRunning: () => false }).readiness();
    expect(byName(r.checks, 'scheduler').status).toBe('fail');
    expect(r.ready).toBe(false);
  });

  it('is ready when the pool is enabled and the scheduler is running', async () => {
    const r = await svc(config({ poolEnabled: true }), okSqlite, {
      isRunning: () => true,
      isPaused: () => false,
      isBackingOff: () => false,
    }).readiness();
    expect(r.ready).toBe(true);
  });

  it('warns (still ready) when the scheduler is paused (Phase 54 D)', async () => {
    const r = await svc(config({ poolEnabled: true }), okSqlite, {
      isRunning: () => true,
      isPaused: () => true,
      isBackingOff: () => false,
    }).readiness();
    expect(byName(r.checks, 'scheduler').status).toBe('warn');
    expect(r.ready).toBe(true); // a warn isn't a fail
  });

  it('warns when the scheduler is backing off an unready DB (Phase 54 D)', async () => {
    const r = await svc(config({ poolEnabled: true }), okSqlite, {
      isRunning: () => true,
      isPaused: () => false,
      isBackingOff: () => true,
    }).readiness();
    expect(byName(r.checks, 'scheduler').status).toBe('warn');
  });
});

describe('HealthService.dbReachable (Phase 54 D)', () => {
  it('returns true when SELECT 1 succeeds', () => {
    expect(svc(config()).dbReachable()).toBe(true);
  });

  it('returns false (fail-open) when the handle throws', () => {
    const throwing = { get sqlite() { throw new Error('locked'); } };
    expect(svc(config(), throwing).dbReachable()).toBe(false);
  });
});
