import { describe, expect, it } from 'vitest';
import { SETUP_ITEM_IDS, type MidniteConfig, type SetupItemId, type SetupItemState } from '@midnite/shared';
import type { AgentsService } from '../agents/agents.service';
import type { CryptoService } from '../crypto/crypto.service';
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

function makeService(o: Opts = {}): SetupService {
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
  return new SetupService(providers, agents, crypto, config);
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
});
