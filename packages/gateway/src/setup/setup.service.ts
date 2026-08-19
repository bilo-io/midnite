import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  isSetupReady,
  type MidniteConfig,
  type SetupItem,
  type SetupStatus,
  type UpdateAgentPoolRequest,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { AgentsService } from '../agents/agents.service';
import { CryptoService, SECRET_KEY_ENV } from '../crypto/crypto.service';
import { persistConfigPatch, resolveConfigWritePath } from '../lib/config-write';
import { AgentPoolScheduler } from '../pool/agent-pool-scheduler.service';
import { AgentPoolService } from '../pool/agent-pool.service';
import { ProvidersService } from '../providers/providers.service';
import { ReposService } from '../repos/repos.service';

// Phase 19 Theme A — the single readiness signal, computed by *composing*
// services that already own each fact (no new persistence, no cross-domain
// repository access):
//   - ProvidersService.list() — a provider with a key / a live-enabled adapter
//   - CryptoService.isEnabled() — is MIDNITE_SECRET_KEY usable
//   - AgentsService — is the configured agent CLI on PATH
//   - the loaded MidniteConfig — agent pool sizing/enablement + repos
//
// NB: the agent-CLI check uses AgentsService (where claude/antigravity/… detection
// lives) rather than EnvironmentService — that probes the dev toolchain
// (homebrew/node/proto/moon), none of which gate readiness here.
@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(
    @Inject(ProvidersService) private readonly providers: ProvidersService,
    @Inject(AgentsService) private readonly agents: AgentsService,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    // The runtime half of a pool update. @Optional so the unit specs (which
    // construct this service directly with fakes) need no edit, and so a config
    // write still succeeds if the pool graph is absent — it then applies on the
    // next boot, which is the old behaviour rather than a failure.
    @Optional() @Inject(AgentPoolService) private readonly pool?: AgentPoolService,
    @Optional() @Inject(AgentPoolScheduler) private readonly scheduler?: AgentPoolScheduler,
    // The repo registry (DB) — the runtime source of truth that `config.repos`
    // merely seeds. @Optional so the unit specs keep their 4-arg construction.
    @Optional() @Inject(ReposService) private readonly repos?: ReposService,
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
    const { pool, poolEnabled } = this.config.agent;
    return { items, ready: isSetupReady(items), agentPool: { pool, poolEnabled } };
  }

  /**
   * Persist the agent-pool settings and apply them to the running gateway.
   *
   * Three steps, in this order:
   *   1. **Write `midnite.json`** so the change survives a restart. On a fresh
   *      install there is no file yet — {@link resolveConfigWritePath} creates
   *      one under `~/.midnite`, which is where the desktop app looks.
   *   2. **Mirror into the in-memory config**, so `/setup/status` and every
   *      service holding the `MIDNITE_CONFIG` object agree immediately.
   *   3. **Apply live** — resize the slots and start/stop the tick loop.
   *
   * Step 3 is what makes this more than a settings write: `poolEnabled` is read
   * once at boot, so without it a user could enable autonomy, see it persisted,
   * and still watch tasks sit in `todo` until they restarted the gateway.
   */
  async updateAgentPool(req: UpdateAgentPoolRequest): Promise<SetupStatus> {
    const path = resolveConfigWritePath();
    persistConfigPatch(path, { agent: { pool: req.pool, poolEnabled: req.poolEnabled } });

    this.config.agent.pool = req.pool;
    this.config.agent.poolEnabled = req.poolEnabled;

    const capacity = this.pool?.resize(req.pool);
    this.scheduler?.applyPoolEnabled(req.poolEnabled);

    this.logger.log(
      `agent pool updated: pool=${req.pool}${
        capacity !== undefined && capacity !== req.pool ? ` (live capacity ${capacity}, busy slots retained)` : ''
      }, poolEnabled=${req.poolEnabled} → ${path}`,
    );
    return this.getStatus();
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

  /**
   * At least one registered repo (optional, never blocks).
   *
   * Counts the **DB registry**, not `config.repos`. The registry is the runtime
   * source of truth (`db/schema.ts`); `config.repos` only *seeds* it on first
   * boot, one way. Reading the seed meant a user who added a repo through the
   * wizard or Settings → Repos was still told "No repos registered yet" forever
   * — the checklist contradicting the thing they had just done. Falls back to
   * the config count when the registry isn't wired (unit specs).
   */
  private repoItem(): SetupItem {
    const count = this.repos ? this.repos.list().length : this.config.repos.length;
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
