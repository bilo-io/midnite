import { Inject, Injectable, Optional } from '@nestjs/common';
import { dirname } from 'node:path';
import type {
  MidniteConfig,
  PreflightCheck,
  Readiness,
  Liveness,
} from '@midnite/shared';
import { worstStatus } from '@midnite/shared';
import { loadConfigFromFile } from '@midnite/shared/config-loader';
import { MIDNITE_CONFIG } from '../config.token';
import { DbFactory } from '../db/db.module';
import { secretKeyPresence } from '../crypto/crypto.service';
import { AgentPoolService } from '../pool/agent-pool.service';
import { AgentPoolScheduler } from '../pool/agent-pool-scheduler.service';
import { findConfigPath } from '../lib/load-config';
import { commandExists, dirWritable, nodePtyLoads, pathExists } from './lib/probes';

/**
 * Central health check registry (Phase 54 A + B). Owns every runtime check once,
 * so **boot preflight** and the **readiness endpoint** report the same truth
 * (and the Phase 54 C watchdog + `midnite doctor` can reuse them). Each check is
 * fail-open: a probe that throws degrades to a `fail`/`warn` result, never an
 * exception out of here.
 *
 * Severity model: hard gaps are `fail` (DB unwritable, agent CLI / spawner
 * missing when the pool is enabled); soft gaps are `warn` (`gh` missing, secret
 * key unset, missing repo paths). `strictBoot` escalation lives in
 * {@link PreflightService}, not here — this service just reports what is.
 */
@Injectable()
export class HealthService {
  private readonly bootAtMs = Date.now();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(DbFactory) private readonly dbFactory: DbFactory,
    @Optional() @Inject(AgentPoolService) private readonly pool?: AgentPoolService,
    @Optional() @Inject(AgentPoolScheduler) private readonly scheduler?: AgentPoolScheduler,
  ) {}

  /** Checks run once at boot (preflight): config, DB, secrets, CLIs, spawner, repos. */
  async bootChecks(): Promise<PreflightCheck[]> {
    return [
      this.checkConfig(),
      this.checkDatabase(),
      this.checkSecretKey(),
      this.checkAgentCli(),
      this.checkGhCli(),
      this.checkSpawner(),
      this.checkRepoPaths(),
    ];
  }

  /** Liveness — the process is up. Never touches the DB. */
  liveness(): Liveness {
    return { ok: true, uptimeMs: this.uptimeMs() };
  }

  /**
   * Cheap boolean DB-reachability probe (Phase 54 D) — a `SELECT 1` against the
   * memoized handle, fail-open (any throw ⇒ false). Used by the scheduler's
   * readiness gate each tick, so it stays light (no table introspection).
   */
  dbReachable(): boolean {
    try {
      this.dbFactory.sqlite.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Readiness — can the gateway serve *now*? Re-evaluates the cheap live checks
   * each call (DB reachable, spawner available, pool up, scheduler running when
   * intended), so it reflects post-boot degradation, not a stale snapshot.
   */
  async readiness(): Promise<Readiness> {
    const checks = [
      this.checkDatabase(),
      this.checkSpawner(),
      this.checkPool(),
      this.checkScheduler(),
    ];
    const worst = worstStatus(checks);
    return { ready: worst !== 'fail', worst, checks, uptimeMs: this.uptimeMs() };
  }

  private uptimeMs(): number {
    return Date.now() - this.bootAtMs;
  }

  // --- individual checks ---

  private checkConfig(): PreflightCheck {
    const explicit = process.env['MIDNITE_CONFIG_PATH'];
    try {
      if (explicit) {
        loadConfigFromFile(explicit);
        return { name: 'config', status: 'ok', detail: `parsed ${explicit} (MIDNITE_CONFIG_PATH)` };
      }
      const found = findConfigPath();
      if (!found) {
        return { name: 'config', status: 'ok', detail: 'no midnite.json found — using built-in defaults' };
      }
      loadConfigFromFile(found);
      return { name: 'config', status: 'ok', detail: `parsed ${found}` };
    } catch (err) {
      return {
        name: 'config',
        status: 'warn',
        detail: `config failed to parse — running on defaults: ${err instanceof Error ? err.message : String(err)}`,
        remedy: 'fix the JSON syntax / schema in midnite.json (see the config schema in @midnite/shared)',
      };
    }
  }

  private checkDatabase(): PreflightCheck {
    const dbPath = this.config.gateway.dbPath;
    try {
      const sqlite = this.dbFactory.sqlite; // builds + migrates on first access
      sqlite.prepare('SELECT 1').get();
      const hasCore = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
        .get();
      if (!hasCore) {
        return {
          name: 'database',
          status: 'fail',
          detail: `database opened but core tables are missing (migrations not applied): ${dbPath}`,
          remedy: 'ensure the drizzle migrations folder ships with the gateway build',
        };
      }
      return { name: 'database', status: 'ok', detail: `writable + migrated: ${dbPath}` };
    } catch (err) {
      const dir = dirname(dbPath);
      const hint = dirWritable(dir) ? '' : ` (directory ${dir} is not writable)`;
      return {
        name: 'database',
        status: 'fail',
        detail: `cannot open database at ${dbPath}${hint}: ${err instanceof Error ? err.message : String(err)}`,
        remedy: 'point gateway.dbPath at a writable location (or set MIDNITE_GATEWAY_DB_PATH)',
      };
    }
  }

  private checkSecretKey(): PreflightCheck {
    const { state, detail } = secretKeyPresence();
    if (state === 'valid') return { name: 'secret-key', status: 'ok', detail };
    if (state === 'invalid') {
      return {
        name: 'secret-key',
        status: 'fail',
        detail,
        remedy: 'set MIDNITE_SECRET_KEY to 32 bytes encoded as hex (64 chars) or base64',
      };
    }
    return {
      name: 'secret-key',
      status: 'warn',
      detail,
      remedy: 'set MIDNITE_SECRET_KEY to store provider API keys / credentials at rest',
    };
  }

  private checkAgentCli(): PreflightCheck {
    const present = commandExists('claude');
    if (present) return { name: 'agent-cli', status: 'ok', detail: '`claude` found on PATH' };
    const poolEnabled = this.config.agent.poolEnabled;
    return {
      name: 'agent-cli',
      status: poolEnabled ? 'fail' : 'warn',
      detail: poolEnabled
        ? '`claude` is not on PATH but agent.poolEnabled is true — the pool cannot spawn agents'
        : '`claude` is not on PATH — autonomous agent sessions will fail to spawn',
      remedy: 'install the Claude Code CLI and ensure `claude` is on the gateway process PATH',
    };
  }

  private checkGhCli(): PreflightCheck {
    return commandExists('gh')
      ? { name: 'gh-cli', status: 'ok', detail: '`gh` found on PATH' }
      : {
          name: 'gh-cli',
          status: 'warn',
          detail: '`gh` is not on PATH — PR status/diff fall back to anonymous REST (public repos only)',
          remedy: 'install the GitHub CLI (`gh`) and authenticate for private-repo PR features',
        };
  }

  private checkSpawner(): PreflightCheck {
    const mode = this.config.terminal.mode;
    const available = mode === 'tmux' ? commandExists('tmux') : nodePtyLoads();
    if (available) {
      return { name: 'spawner', status: 'ok', detail: `terminal backend '${mode}' is available` };
    }
    const poolEnabled = this.config.agent.poolEnabled;
    return {
      name: 'spawner',
      status: poolEnabled ? 'fail' : 'warn',
      detail:
        mode === 'tmux'
          ? '`tmux` is not on PATH but terminal.mode is tmux — sessions cannot spawn'
          : 'node-pty failed to load but terminal.mode is pty — sessions cannot spawn',
      remedy:
        mode === 'tmux'
          ? 'install tmux, or set terminal.mode to pty'
          : 'reinstall dependencies so the node-pty native module builds, or use terminal.mode tmux',
    };
  }

  private checkRepoPaths(): PreflightCheck {
    const missing = this.config.repos.filter((r) => !pathExists(r.path));
    if (this.config.repos.length === 0) {
      return { name: 'repo-paths', status: 'ok', detail: 'no repos configured' };
    }
    if (missing.length === 0) {
      return { name: 'repo-paths', status: 'ok', detail: `all ${this.config.repos.length} configured repo path(s) resolve` };
    }
    return {
      name: 'repo-paths',
      status: 'warn',
      detail: `configured repo path(s) not found: ${missing.map((r) => `${r.name} (${r.path})`).join(', ')}`,
      remedy: 'fix the path in config.repos[].path, or remove the entry',
    };
  }

  private checkPool(): PreflightCheck {
    if (!this.pool) {
      return { name: 'pool', status: 'warn', detail: 'agent pool service is not available' };
    }
    return { name: 'pool', status: 'ok', detail: `pool initialized (${this.pool.capacity()} slots, ${this.pool.freeSlotCount()} free)` };
  }

  private checkScheduler(): PreflightCheck {
    if (!this.config.agent.poolEnabled) {
      return { name: 'scheduler', status: 'ok', detail: 'agent pool disabled — scheduler not intended to run' };
    }
    if (!this.scheduler) {
      return { name: 'scheduler', status: 'warn', detail: 'scheduler service is not available' };
    }
    if (!this.scheduler.isRunning()) {
      return {
        name: 'scheduler',
        status: 'fail',
        detail: 'agent.poolEnabled is true but the scheduler tick loop is not running',
        remedy: 'check the gateway logs for a scheduler start failure',
      };
    }
    // Running, but reflect Phase 54 D degraded states as a warn so readiness shows
    // the truth: paused (lifecycle stop / drain) or backing off a DB outage.
    if (this.scheduler.isPaused()) {
      return { name: 'scheduler', status: 'warn', detail: 'scheduler is paused (not accepting new work)' };
    }
    if (this.scheduler.isBackingOff()) {
      return {
        name: 'scheduler',
        status: 'warn',
        detail: 'scheduler is backing off — a dependency (database) is unavailable',
        remedy: 'check database reachability; the scheduler resumes automatically when it recovers',
      };
    }
    return { name: 'scheduler', status: 'ok', detail: 'scheduler tick loop is running' };
  }
}
