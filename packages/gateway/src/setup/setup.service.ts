import { Inject, Injectable } from '@nestjs/common';
import { isSetupReady, type MidniteConfig, type SetupItem, type SetupStatus } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { AgentsService } from '../agents/agents.service';
import { CryptoService, SECRET_KEY_ENV } from '../crypto/crypto.service';
import { ProvidersService } from '../providers/providers.service';

// Phase 19 Theme A — the single readiness signal, computed by *composing*
// services that already own each fact (no new persistence, no cross-domain
// repository access):
//   - ProvidersService.list() — a provider with a key / a live-enabled adapter
//   - CryptoService.isEnabled() — is MIDNITE_SECRET_KEY usable
//   - AgentsService — is the configured agent CLI on PATH
//   - the loaded MidniteConfig — agent pool sizing/enablement + repos
//
// NB: the agent-CLI check uses AgentsService (where claude/gemini/… detection
// lives) rather than EnvironmentService — that probes the dev toolchain
// (homebrew/node/proto/moon), none of which gate readiness here.
@Injectable()
export class SetupService {
  constructor(
    @Inject(ProvidersService) private readonly providers: ProvidersService,
    @Inject(AgentsService) private readonly agents: AgentsService,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {}

  async getStatus(): Promise<SetupStatus> {
    // Only the agent-CLI probe is async; the rest are in-memory reads.
    const agentCli = await this.agentCliItem();
    const items: SetupItem[] = [
      this.providerItem(),
      this.secretKeyItem(),
      agentCli,
      this.agentPoolItem(),
      this.repoItem(),
    ];
    return { items, ready: isSetupReady(items) };
  }

  /** A provider has a stored key, or the active adapter resolves (env/keychain). */
  private providerItem(): SetupItem {
    const { providers, activeProvider, activeProviderEnabled } = this.providers.list();
    const withKey = providers.filter((p) => p.hasKey).map((p) => p.provider);
    if (activeProviderEnabled || withKey.length > 0) {
      return {
        id: 'provider',
        label: 'LLM provider',
        state: 'ok',
        detail: activeProviderEnabled ? `${activeProvider} ready` : `key set for ${withKey.join(', ')}`,
      };
    }
    return {
      id: 'provider',
      label: 'LLM provider',
      state: 'missing',
      detail: 'No provider has an API key — add one in Settings → Agents.',
    };
  }

  /** The encryption key that makes stored credentials usable (fail-closed). */
  private secretKeyItem(): SetupItem {
    if (this.crypto.isEnabled()) {
      return { id: 'secret-key', label: 'Secret key', state: 'ok', detail: `${SECRET_KEY_ENV} set` };
    }
    return {
      id: 'secret-key',
      label: 'Secret key',
      state: 'missing',
      detail: `${SECRET_KEY_ENV} not set — required to store provider keys at rest.`,
    };
  }

  /** The configured agent CLI's binary on PATH (reuses the login-shell probe). */
  private async agentCliItem(): Promise<SetupItem> {
    const cli = this.agents.getAgentCli();
    const status = await this.agents.getCliStatus(cli);
    if (status.installed) {
      return {
        id: 'agent-cli',
        label: 'Agent CLI',
        state: 'ok',
        detail: `${cli}${status.version ? ` ${status.version}` : ''} on PATH`,
      };
    }
    return {
      id: 'agent-cli',
      label: 'Agent CLI',
      state: 'missing',
      detail: `${cli} not found on PATH — install it from Settings → System.`,
    };
  }

  /** Pool sizing + the autonomous-scheduling flag. A `warn`, never a blocker. */
  private agentPoolItem(): SetupItem {
    const { pool, poolEnabled } = this.config.agent;
    if (poolEnabled && pool > 0) {
      return {
        id: 'agent-pool',
        label: 'Agent pool',
        state: 'ok',
        detail: `${pool} slot${pool === 1 ? '' : 's'}, autonomous scheduling on`,
      };
    }
    return {
      id: 'agent-pool',
      label: 'Agent pool',
      state: 'warn',
      detail: poolEnabled
        ? 'Pool enabled but sized to 0.'
        : 'Autonomous scheduling off — sessions spawn only when you attach a terminal.',
    };
  }

  /** At least one registered repo (forward-compatible; optional, never blocks). */
  private repoItem(): SetupItem {
    const count = this.config.repos.length;
    if (count > 0) {
      return {
        id: 'repo',
        label: 'Repository',
        state: 'ok',
        detail: `${count} registered`,
      };
    }
    return {
      id: 'repo',
      label: 'Repository',
      state: 'warn',
      detail: 'No repos registered yet (optional).',
    };
  }
}
