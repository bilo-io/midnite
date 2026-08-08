import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SETUP_ITEM_IDS, type MidniteConfig, type SetupItemId, type SetupItemState } from '@midnite/shared';
import type { AgentsService } from '../agents/agents.service';
import type { CryptoService } from '../crypto/crypto.service';
import type { AgentPoolScheduler } from '../pool/agent-pool-scheduler.service';
import type { AgentPoolService } from '../pool/agent-pool.service';
import type { ProvidersService } from '../providers/providers.service';
import { SetupService } from './setup.service';

type Opts = {
  providerHasKey?: boolean;
  activeEnabled?: boolean;
  secretKey?: boolean;
  cliInstalled?: boolean;
  poolEnabled?: boolean;
  pool?: number;
  repos?: number;
};

/** The four required constructor deps, as fakes. Split out from
 *  {@link makeService} so the pool-update specs can append their own spies. */
function makeDeps(o: Opts = {}): [ProvidersService, AgentsService, CryptoService, MidniteConfig] {
  const providers = {
    list: () => ({
      providers: [
        { provider: 'anthropic', hasKey: o.providerHasKey ?? false },
        { provider: 'openai', hasKey: false },
      ],
      activeProvider: 'anthropic',
      activeProviderEnabled: o.activeEnabled ?? false,
    }),
  } as unknown as ProvidersService;
  const agents = {
    getAgentCli: () => 'claude',
    getCliStatus: async () => ({
      cli: 'claude',
      installed: o.cliInstalled ?? false,
      ...(o.cliInstalled ? { version: '1.2.3' } : {}),
    }),
  } as unknown as AgentsService;
  const crypto = { isEnabled: () => o.secretKey ?? false } as unknown as CryptoService;
  const config = {
    agent: { pool: o.pool ?? 4, poolEnabled: o.poolEnabled ?? false },
    repos: Array.from({ length: o.repos ?? 0 }, (_, i) => ({ name: `r${i}`, path: `/r${i}` })),
  } as unknown as MidniteConfig;
  return [providers, agents, crypto, config];
}

function makeService(o: Opts = {}): SetupService {
  return new SetupService(...makeDeps(o));
}

/** Pull a single item's state out of a status, by id. */
async function stateOf(svc: SetupService, id: SetupItemId): Promise<SetupItemState | undefined> {
  const { items } = await svc.getStatus();
  return items.find((i) => i.id === id)?.state;
}

describe('SetupService.getStatus', () => {
  it('returns one item per checklist id, in canonical order', async () => {
    const { items } = await makeService().getStatus();
    expect(items.map((i) => i.id)).toEqual([...SETUP_ITEM_IDS]);
  });

  it('a fresh install is not ready: provider/secret/CLI missing, pool/repo warn', async () => {
    const { items, ready } = await makeService().getStatus();
    expect(ready).toBe(false);
    const state = (id: SetupItemId) => items.find((i) => i.id === id)?.state;
    expect(state('provider')).toBe('missing');
    expect(state('secret-key')).toBe('missing');
    expect(state('agent-cli')).toBe('missing');
    expect(state('agent-pool')).toBe('warn');
    expect(state('repo')).toBe('warn');
  });

  it('is ready with a secret key + a stored provider key', async () => {
    const svc = makeService({ secretKey: true, providerHasKey: true });
    const { ready } = await svc.getStatus();
    expect(ready).toBe(true);
    expect(await stateOf(svc, 'provider')).toBe('ok');
  });

  it('counts a live-enabled adapter (env/keychain) as a configured provider', async () => {
    // No stored key, but the active adapter resolves — provider is satisfied.
    const svc = makeService({ secretKey: true, activeEnabled: true });
    expect(await stateOf(svc, 'provider')).toBe('ok');
    expect((await svc.getStatus()).ready).toBe(true);
  });

  it('accepts a working agent CLI in place of a provider key', async () => {
    const svc = makeService({ secretKey: true, cliInstalled: true });
    expect(await stateOf(svc, 'agent-cli')).toBe('ok');
    expect((await svc.getStatus()).ready).toBe(true);
  });

  it('a provider key without the secret key is still not ready', async () => {
    expect((await makeService({ providerHasKey: true }).getStatus()).ready).toBe(false);
  });

  it('marks the pool ok only when enabled and sized', async () => {
    expect(await stateOf(makeService({ poolEnabled: true, pool: 4 }), 'agent-pool')).toBe('ok');
    expect(await stateOf(makeService({ poolEnabled: true, pool: 0 }), 'agent-pool')).toBe('warn');
    expect(await stateOf(makeService({ poolEnabled: false }), 'agent-pool')).toBe('warn');
  });

  it('marks repo ok once at least one is registered', async () => {
    expect(await stateOf(makeService({ repos: 0 }), 'repo')).toBe('warn');
    expect(await stateOf(makeService({ repos: 2 }), 'repo')).toBe('ok');
  });

  it('echoes the live pool settings so clients bind to the server, not localStorage', async () => {
    const status = await makeService({ pool: 6, poolEnabled: true }).getStatus();
    expect(status.agentPool).toEqual({ pool: 6, poolEnabled: true });
  });
});

describe('SetupService.updateAgentPool', () => {
  let dir: string;
  const ORIGINAL_ENV = process.env['MIDNITE_CONFIG_PATH'];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'midnite-setup-pool-'));
    // Pin the write target so the suite never touches the developer's real
    // ~/.midnite/midnite.json or the repo's own config.
    process.env['MIDNITE_CONFIG_PATH'] = join(dir, 'midnite.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (ORIGINAL_ENV === undefined) delete process.env['MIDNITE_CONFIG_PATH'];
    else process.env['MIDNITE_CONFIG_PATH'] = ORIGINAL_ENV;
  });

  /** A service wired to spies standing in for the live pool + scheduler. */
  function withPool(o: Opts = {}) {
    const pool = { resize: vi.fn((n: number) => n) };
    const scheduler = { applyPoolEnabled: vi.fn() };
    const svc = new SetupService(
      ...makeDeps(o),
      pool as unknown as AgentPoolService,
      scheduler as unknown as AgentPoolScheduler,
    );
    return { svc, pool, scheduler };
  }

  it('persists the settings to midnite.json', async () => {
    const { svc } = withPool();
    await svc.updateAgentPool({ pool: 8, poolEnabled: true });

    const written = JSON.parse(readFileSync(join(dir, 'midnite.json'), 'utf8'));
    expect(written.agent).toMatchObject({ pool: 8, poolEnabled: true });
  });

  it('creates midnite.json on a fresh install where none exists', async () => {
    // The whole point of the fix: a downloaded app has no config file, so the
    // write has to create one rather than fail or no-op.
    expect(existsSync(join(dir, 'midnite.json'))).toBe(false);
    const { svc } = withPool();
    await svc.updateAgentPool({ pool: 2, poolEnabled: true });
    expect(existsSync(join(dir, 'midnite.json'))).toBe(true);
  });

  it('mirrors into the in-memory config so status reflects it without a restart', async () => {
    const { svc } = withPool({ pool: 4, poolEnabled: false });
    const status = await svc.updateAgentPool({ pool: 3, poolEnabled: true });

    expect(status.agentPool).toEqual({ pool: 3, poolEnabled: true });
    expect(status.items.find((i) => i.id === 'agent-pool')?.state).toBe('ok');
  });

  it('applies live: resizes the slots and starts the tick loop', async () => {
    const { svc, pool, scheduler } = withPool({ poolEnabled: false });
    await svc.updateAgentPool({ pool: 5, poolEnabled: true });

    expect(pool.resize).toHaveBeenCalledWith(5);
    // Without this the flag persists but the scheduler stays parked until the
    // next boot — the exact "I enabled it and nothing happened" trap.
    expect(scheduler.applyPoolEnabled).toHaveBeenCalledWith(true);
  });

  it('stops the tick loop when autonomy is turned off', async () => {
    const { svc, scheduler } = withPool({ poolEnabled: true });
    await svc.updateAgentPool({ pool: 4, poolEnabled: false });
    expect(scheduler.applyPoolEnabled).toHaveBeenCalledWith(false);
  });

  it('still persists when the pool graph is absent (config-only fallback)', async () => {
    // @Optional deps: the write must not depend on the runtime half being wired.
    const svc = makeService();
    await expect(svc.updateAgentPool({ pool: 4, poolEnabled: true })).resolves.toBeDefined();
    expect(JSON.parse(readFileSync(join(dir, 'midnite.json'), 'utf8')).agent.poolEnabled).toBe(true);
  });
});
