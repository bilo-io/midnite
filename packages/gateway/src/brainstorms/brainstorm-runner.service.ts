import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AGENT_CLI_DEFAULT,
  AgentCliSchema,
  BRAINSTORM_SYNTH_MODE_DEFAULT,
  BRAINSTORM_SYNTH_PROVIDER_DEFAULT,
  BrainstormSynthModeSchema,
  type AgentCli,
  type BrainstormRun,
  type BrainstormSynthMode,
  type MidniteConfig,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { TerminalService } from '../terminal/terminal.service';
import { cleanPtyOutput } from '../terminal/lib/clean-output';
import { oneshotCommand } from '../terminal/lib/oneshot-command';
import { BrainstormDoesNotExistError } from './brainstorms.service';
import { BrainstormsRepository } from './brainstorms.repository';
import {
  SYNTH_SYSTEM_PROMPT,
  buildContributorPrompt,
  buildSynthesisPrompt,
} from './lib/brainstorm-prompts';

export class BrainstormRunInProgressError extends Error {}
export class BrainstormEmptyError extends Error {}
export class BrainstormContributorNotLiveError extends Error {}
export class BrainstormRunNotRetryableError extends Error {}

// Cap the per-contributor capture buffer; anything past it is dropped (the tail
// of a runaway TUI redraw, not ideas) and the truncation is flagged.
const CAPTURE_LIMIT_BYTES = 2 * 1024 * 1024;

interface LiveContributor {
  rowId: string;
  terminalId: string;
  buffer: string;
  bufferBytes: number;
  truncated: boolean;
  timedOut: boolean;
  skipped: boolean;
  timeout: NodeJS.Timeout | null;
  settled: boolean;
}

/**
 * Orchestrates a brainstorm run: spawns each contributor's one-shot CLI in a
 * managed PTY (watchable over the normal terminal WS), captures and cleans the
 * generated ideas, and — once all settle — hands the attributed ideas to the
 * brainstorm's synthesizer CLI, which distills them in the run's chosen mode.
 * Unlike a council there is no anonymization: the synthesizer sees who said what,
 * and the mode can be switched and re-run over the captured ideas.
 */
@Injectable()
export class BrainstormRunnerService implements OnModuleInit {
  private readonly logger = new Logger(BrainstormRunnerService.name);
  // One live run per brainstorm; in-memory like CouncilRunnerService.activeRuns.
  private readonly activeRuns = new Set<string>();
  // Live per-contributor state by run id, so a viewer can skip a hung CLI.
  private readonly liveRuns = new Map<string, LiveContributor[]>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(BrainstormsRepository) private readonly repo: BrainstormsRepository,
    @Inject(TerminalService) private readonly terminal: TerminalService,
  ) {}

  // PTYs die with the process, so any run still marked live after a restart is dead.
  onModuleInit(): void {
    for (const run of this.repo.listStaleRuns()) {
      this.repo.updateRun(run.id, {
        status: 'failed',
        error: 'gateway restarted mid-run',
        finishedAt: new Date().toISOString(),
      });
      for (const c of this.repo.listRunContributors(run.id)) {
        if (c.status === 'running') {
          this.repo.updateRunContributor(c.id, {
            status: 'failed',
            error: 'gateway restarted mid-run',
            finishedAt: new Date().toISOString(),
          });
        }
      }
      this.logger.warn(`marked stale brainstorm run ${run.id} as failed (gateway restart)`);
    }
  }

  startRun(brainstormId: string, prompt: string, mode?: BrainstormSynthMode): BrainstormRun {
    const brainstorm = this.repo.getBrainstorm(brainstormId);
    if (!brainstorm) {
      throw new BrainstormDoesNotExistError(`brainstorm ${brainstormId} does not exist`);
    }
    const contributors = this.repo.listContributors(brainstormId);
    if (contributors.length < 1) {
      throw new BrainstormEmptyError('a brainstorm run needs at least 1 contributor');
    }
    if (this.activeRuns.has(brainstormId)) {
      throw new BrainstormRunInProgressError('this brainstorm already has a run in progress');
    }

    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    this.activeRuns.add(brainstormId);
    this.repo.insertRun({
      id: runId,
      brainstormId,
      prompt,
      // Coalesce the requested mode (or the board default) to a known mode.
      mode: BrainstormSynthModeSchema.catch(BRAINSTORM_SYNTH_MODE_DEFAULT).parse(
        mode ?? brainstorm.defaultMode,
      ),
      status: 'running',
      // Snapshot the synthesizer at start time, like contributor rows.
      synthProvider: AgentCliSchema.catch(BRAINSTORM_SYNTH_PROVIDER_DEFAULT).parse(
        brainstorm.synthProvider,
      ),
      synthesis: null,
      error: null,
      startedAt,
      finishedAt: null,
    });

    const live: LiveContributor[] = [];
    for (const c of contributors) {
      const terminalId = `brainstorm-${runId}-${c.id}`;
      const row = this.repo.insertRunContributor({
        id: randomUUID(),
        runId,
        contributorId: c.id,
        name: c.name,
        provider: c.provider,
        lens: c.lens,
        status: 'running',
        terminalId,
        output: null,
        exitCode: null,
        error: null,
        startedAt: new Date().toISOString(),
      });
      live.push({
        rowId: row.id,
        terminalId,
        buffer: '',
        bufferBytes: 0,
        truncated: false,
        timedOut: false,
        skipped: false,
        timeout: null,
        settled: false,
      });
    }
    this.liveRuns.set(runId, live);

    const run = this.repo.getRun(runId)!;
    // Spawn after every row exists so a fast-exiting CLI can't trigger the
    // synthesis barrier while siblings are still unregistered.
    for (const [i, c] of contributors.entries()) {
      // Coalesce an unknown stored provider to the default, matching getAgentCli.
      const provider = AgentCliSchema.catch(AGENT_CLI_DEFAULT).parse(c.provider);
      this.spawnContributor(brainstormId, runId, live[i]!, provider, c.lens, prompt, live);
    }
    return this.repo.hydrateRun(run);
  }

  private spawnContributor(
    brainstormId: string,
    runId: string,
    lc: LiveContributor,
    provider: AgentCli,
    lens: string,
    prompt: string,
    all: LiveContributor[],
  ): void {
    const contributorPrompt = buildContributorPrompt(lens, prompt);
    const spawned = this.terminal.spawnManagedRun(
      lc.terminalId,
      { ...oneshotCommand(provider, contributorPrompt), cwd: process.cwd() },
      {
        onData: (chunk) => {
          if (lc.bufferBytes >= CAPTURE_LIMIT_BYTES) {
            lc.truncated = true;
            return;
          }
          lc.buffer += chunk;
          lc.bufferBytes += Buffer.byteLength(chunk, 'utf8');
        },
        onExit: (exitCode) => this.settleContributor(brainstormId, runId, lc, exitCode, all),
      },
    );

    if (!spawned.ok) {
      lc.settled = true;
      this.repo.updateRunContributor(lc.rowId, {
        status: 'failed',
        error: spawned.error,
        finishedAt: new Date().toISOString(),
      });
      this.logger.warn(`brainstorm contributor spawn failed (${lc.terminalId}): ${spawned.error}`);
      // The barrier still has to fire if this was the last unsettled contributor.
      this.maybeSynthesize(brainstormId, runId, all);
      return;
    }

    const timeoutMs = this.config.brainstorms.runTimeoutMs;
    lc.timeout = setTimeout(() => {
      lc.timedOut = true;
      this.terminal.killManagedRun(lc.terminalId); // onExit settles the row
    }, timeoutMs);
    lc.timeout.unref?.();
  }

  /**
   * Skip a still-running contributor (e.g. a CLI hung on a missing API key):
   * kill its PTY and settle it as 'skipped' so the run stops waiting on it.
   * Synthesis proceeds as soon as the remaining contributors finish. Returns
   * the updated run.
   */
  skipContributor(brainstormId: string, runId: string, runContributorId: string): BrainstormRun {
    const run = this.repo.getRun(runId);
    if (!run || run.brainstormId !== brainstormId) {
      throw new BrainstormDoesNotExistError(
        `run ${runId} does not exist on brainstorm ${brainstormId}`,
      );
    }
    const live = this.liveRuns.get(runId);
    const lc = live?.find((c) => c.rowId === runContributorId);
    if (!live || !lc || lc.settled) {
      throw new BrainstormContributorNotLiveError(
        `contributor ${runContributorId} is not running — nothing to skip`,
      );
    }
    lc.skipped = true;
    // The kill lands asynchronously and onExit settles the row. If the PTY is
    // already gone (spawned-then-died race), settle directly so the run can't
    // wait forever on a corpse.
    if (this.terminal.has(lc.terminalId)) {
      this.terminal.killManagedRun(lc.terminalId);
    } else {
      this.settleContributor(brainstormId, runId, lc, -1, live);
    }
    return this.repo.hydrateRun(this.repo.getRun(runId)!);
  }

  /**
   * Re-run one settled contributor of a finished run: reset its row, respawn its
   * one-shot CLI, and re-synthesize when it settles. Like a council retry it
   * re-syncs the run snapshot (name/provider/lens) from the *current* brainstorm
   * contributor first, so fixing a failed contributor's provider/lens and
   * retrying actually re-runs with the new config. Falls back to the existing
   * snapshot if the contributor has since been removed.
   */
  retryContributor(brainstormId: string, runId: string, runContributorId: string): BrainstormRun {
    const run = this.repo.getRun(runId);
    if (!run || run.brainstormId !== brainstormId) {
      throw new BrainstormDoesNotExistError(
        `run ${runId} does not exist on brainstorm ${brainstormId}`,
      );
    }
    if (
      this.activeRuns.has(brainstormId) ||
      run.status === 'running' ||
      run.status === 'synthesizing'
    ) {
      throw new BrainstormRunInProgressError('this brainstorm already has a run in progress');
    }
    const row = this.repo.listRunContributors(runId).find((r) => r.id === runContributorId);
    if (!row || row.status === 'running') {
      throw new BrainstormRunNotRetryableError(
        `contributor ${runContributorId} is not in a retryable state`,
      );
    }

    // Re-sync the snapshot from the live contributor (edits made since the run
    // are the whole point of a retry); fall back to the snapshot if removed.
    const current = this.repo.getContributor(row.contributorId);
    const snapshot =
      current && current.brainstormId === brainstormId
        ? { name: current.name, provider: current.provider, lens: current.lens }
        : { name: row.name, provider: row.provider, lens: row.lens };

    this.activeRuns.add(brainstormId);
    this.repo.updateRun(runId, {
      status: 'running',
      error: null,
      synthesis: null,
      finishedAt: null,
    });
    this.repo.updateRunContributor(row.id, {
      ...snapshot,
      status: 'running',
      output: null,
      exitCode: null,
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });

    const lc: LiveContributor = {
      rowId: row.id,
      terminalId: row.terminalId,
      buffer: '',
      bufferBytes: 0,
      truncated: false,
      timedOut: false,
      skipped: false,
      timeout: null,
      settled: false,
    };
    // Only the retried contributor is live; the others' persisted rows feed
    // synthesis unchanged once it settles.
    const live = [lc];
    this.liveRuns.set(runId, live);
    const provider = AgentCliSchema.catch(AGENT_CLI_DEFAULT).parse(snapshot.provider);
    this.spawnContributor(brainstormId, runId, lc, provider, snapshot.lens, run.prompt, live);
    return this.repo.hydrateRun(this.repo.getRun(runId)!);
  }

  /**
   * Re-synthesize a finished run from its persisted ideas — optionally in a new
   * mode — with the brainstorm's *current* synthesizer. This is the heart of the
   * feature: switch the mode (shortlist → gaps → opportunities …) and re-run the
   * cheap synthesis step without re-generating ideas. Also the rate-limit escape
   * hatch (switch the synthesizer provider and retry).
   */
  retrySynthesis(
    brainstormId: string,
    runId: string,
    mode?: BrainstormSynthMode,
  ): BrainstormRun {
    const run = this.repo.getRun(runId);
    if (!run || run.brainstormId !== brainstormId) {
      throw new BrainstormDoesNotExistError(
        `run ${runId} does not exist on brainstorm ${brainstormId}`,
      );
    }
    if (
      this.activeRuns.has(brainstormId) ||
      run.status === 'running' ||
      run.status === 'synthesizing'
    ) {
      throw new BrainstormRunInProgressError('this brainstorm already has a run in progress');
    }

    const brainstorm = this.repo.getBrainstorm(brainstormId);
    const provider = AgentCliSchema.catch(BRAINSTORM_SYNTH_PROVIDER_DEFAULT).parse(
      brainstorm?.synthProvider,
    );
    const nextMode = BrainstormSynthModeSchema.catch(BRAINSTORM_SYNTH_MODE_DEFAULT).parse(
      mode ?? run.mode,
    );
    this.repo.updateRun(runId, { synthProvider: provider, mode: nextMode });

    this.activeRuns.add(brainstormId);
    this.liveRuns.set(runId, []);
    this.synthesize(brainstormId, runId);
    return this.repo.hydrateRun(this.repo.getRun(runId)!);
  }

  private settleContributor(
    brainstormId: string,
    runId: string,
    lc: LiveContributor,
    exitCode: number,
    all: LiveContributor[],
  ): void {
    if (lc.settled) return;
    lc.settled = true;
    if (lc.timeout) {
      clearTimeout(lc.timeout);
      lc.timeout = null;
    }

    let output = cleanPtyOutput(lc.buffer);
    if (lc.truncated) output += '\n\n[output truncated]';
    const status = lc.skipped
      ? 'skipped'
      : lc.timedOut
        ? 'timeout'
        : exitCode === 0 && output.trim()
          ? 'succeeded'
          : 'failed';
    this.repo.updateRunContributor(lc.rowId, {
      status,
      output: output || null,
      exitCode,
      error:
        status === 'skipped'
          ? 'skipped by user'
          : status === 'timeout'
            ? `timed out after ${this.config.brainstorms.runTimeoutMs}ms`
            : status === 'failed'
              ? exitCode === 0
                ? 'process exited without output'
                : `process exited with code ${exitCode}`
              : null,
      finishedAt: new Date().toISOString(),
    });

    this.maybeSynthesize(brainstormId, runId, all);
  }

  private maybeSynthesize(brainstormId: string, runId: string, all: LiveContributor[]): void {
    if (!all.every((c) => c.settled)) return;
    this.synthesize(brainstormId, runId);
  }

  /**
   * Hand the attributed ideas to the brainstorm's synthesizer — a one-shot CLI
   * run, watchable live like the contributors'. Never throws.
   */
  private synthesize(brainstormId: string, runId: string): void {
    try {
      this.repo.updateRun(runId, {
        status: 'synthesizing',
        error: null,
        synthesis: null,
        finishedAt: null,
      });
      const run = this.repo.getRun(runId)!;
      const rows = this.repo.listRunContributors(runId);
      // Attribute every contributor by name + lens (no anonymization). A
      // succeeded row with output carries its ideas; everything else is a null
      // entry the synthesizer reads as "this lens produced nothing".
      const entries = rows.map((r, i) => ({
        name: r.name.trim() || `Contributor ${i + 1}`,
        lens: r.lens,
        output: r.status === 'succeeded' && r.output ? r.output : null,
      }));

      if (!entries.some((e) => e.output !== null)) {
        this.repo.updateRun(runId, {
          status: 'failed',
          error: 'no contributor produced ideas — nothing to synthesize',
          finishedAt: new Date().toISOString(),
        });
        this.finishRun(brainstormId, runId);
        return;
      }

      const mode = BrainstormSynthModeSchema.catch(BRAINSTORM_SYNTH_MODE_DEFAULT).parse(run.mode);
      const provider = AgentCliSchema.catch(BRAINSTORM_SYNTH_PROVIDER_DEFAULT).parse(
        run.synthProvider ?? BRAINSTORM_SYNTH_PROVIDER_DEFAULT,
      );
      // CLIs take a single prompt, so the facilitator framing rides in front.
      const prompt = `${SYNTH_SYSTEM_PROMPT}\n\n${buildSynthesisPrompt(mode, run.prompt, entries)}`;
      this.runSynthesis(brainstormId, runId, provider, mode, prompt);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`brainstorm run ${runId} synthesis failed: ${errorMsg}`);
      this.repo.updateRun(runId, {
        status: 'failed',
        error: `synthesis failed: ${errorMsg}`,
        finishedAt: new Date().toISOString(),
      });
      this.finishRun(brainstormId, runId);
    }
  }

  /** Run the synthesizer CLI in a managed PTY under the run's deterministic synth attach id. */
  private runSynthesis(
    brainstormId: string,
    runId: string,
    provider: AgentCli,
    mode: BrainstormSynthMode,
    prompt: string,
  ): void {
    const terminalId = `brainstorm-${runId}-synth`;
    const state = {
      buffer: '',
      bufferBytes: 0,
      truncated: false,
      timedOut: false,
      settled: false,
      timeout: null as NodeJS.Timeout | null,
    };

    const spawned = this.terminal.spawnManagedRun(
      terminalId,
      { ...oneshotCommand(provider, prompt), cwd: process.cwd() },
      {
        onData: (chunk) => {
          if (state.bufferBytes >= CAPTURE_LIMIT_BYTES) {
            state.truncated = true;
            return;
          }
          state.buffer += chunk;
          state.bufferBytes += Buffer.byteLength(chunk, 'utf8');
        },
        onExit: (exitCode) => {
          if (state.settled) return;
          state.settled = true;
          if (state.timeout) clearTimeout(state.timeout);

          let output = cleanPtyOutput(state.buffer);
          if (state.truncated) output += '\n\n[output truncated]';
          if (!state.timedOut && exitCode === 0 && output.trim()) {
            const finishedAt = new Date().toISOString();
            this.repo.updateRun(runId, { status: 'completed', synthesis: output, finishedAt });
            // Archive this mode's result so re-synthesizing in another mode keeps it.
            this.repo.recordSynthesis(runId, {
              mode,
              synthesis: output,
              synthProvider: provider,
              finishedAt,
            });
          } else {
            // Surface the output tail so auth/setup errors are visible at a glance.
            const tail = output.trim() ? `: ${output.slice(-300).trim()}` : '';
            this.repo.updateRun(runId, {
              status: 'failed',
              error: state.timedOut
                ? `synthesis (${provider}) timed out after ${this.config.brainstorms.runTimeoutMs}ms`
                : `synthesis (${provider}) exited with code ${exitCode}${tail}`,
              finishedAt: new Date().toISOString(),
            });
          }
          this.finishRun(brainstormId, runId);
        },
      },
    );

    if (!spawned.ok) {
      this.repo.updateRun(runId, {
        status: 'failed',
        error: `synthesis (${provider}) failed to start: ${spawned.error}`,
        finishedAt: new Date().toISOString(),
      });
      this.finishRun(brainstormId, runId);
      return;
    }

    state.timeout = setTimeout(() => {
      state.timedOut = true;
      this.terminal.killManagedRun(terminalId); // onExit settles the run
    }, this.config.brainstorms.runTimeoutMs);
    state.timeout.unref?.();
  }

  private finishRun(brainstormId: string, runId: string): void {
    this.activeRuns.delete(brainstormId);
    this.liveRuns.delete(runId);
  }
}
