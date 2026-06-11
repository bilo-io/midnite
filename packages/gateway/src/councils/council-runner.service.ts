import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AGENT_CLI_DEFAULT,
  AgentCliSchema,
  COUNCIL_VERDICT_PROVIDER_DEFAULT,
  type AgentCli,
  type CouncilRun,
  type MidniteConfig,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { TerminalService } from '../terminal/terminal.service';
import { CouncilDoesNotExistError } from './councils.service';
import { CouncilsRepository } from './councils.repository';
import { cleanPtyOutput } from './lib/clean-output';
import {
  VERDICT_SYSTEM_PROMPT,
  buildParticipantPrompt,
  buildVerdictPrompt,
} from './lib/council-prompts';
import { oneshotCommand } from './lib/oneshot-command';

export class CouncilRunInProgressError extends Error {}
export class CouncilTooSmallError extends Error {}
export class CouncilParticipantNotLiveError extends Error {}

// Cap the per-participant capture buffer; anything past it is dropped (the tail
// of a runaway TUI redraw, not the argument) and the truncation is flagged.
const CAPTURE_LIMIT_BYTES = 2 * 1024 * 1024;

interface LiveParticipant {
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
 * Orchestrates a council run: spawns each participant's one-shot CLI in a
 * managed PTY (watchable over the normal terminal WS), captures and cleans
 * their output, and — once all settle — anonymizes the takes (shuffle + label)
 * and runs the council's verdict provider CLI over them for a verdict that
 * weighs the options without knowing who said what.
 */
@Injectable()
export class CouncilRunnerService implements OnModuleInit {
  private readonly logger = new Logger(CouncilRunnerService.name);
  // One live run per council; in-memory like HeartbeatScheduler.running.
  private readonly activeRuns = new Set<string>();
  // Live per-participant state by run id, so a viewer can skip a hung CLI.
  private readonly liveRuns = new Map<string, LiveParticipant[]>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(CouncilsRepository) private readonly repo: CouncilsRepository,
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
      for (const p of this.repo.listRunParticipants(run.id)) {
        if (p.status === 'running') {
          this.repo.updateRunParticipant(p.id, {
            status: 'failed',
            error: 'gateway restarted mid-run',
            finishedAt: new Date().toISOString(),
          });
        }
      }
      this.logger.warn(`marked stale council run ${run.id} as failed (gateway restart)`);
    }
  }

  startRun(councilId: string, topic: string): CouncilRun {
    const council = this.repo.getCouncil(councilId);
    if (!council) throw new CouncilDoesNotExistError(`council ${councilId} does not exist`);
    const participants = this.repo.listParticipants(councilId);
    if (participants.length < 2) {
      throw new CouncilTooSmallError('a council run needs at least 2 participants');
    }
    if (this.activeRuns.has(councilId)) {
      throw new CouncilRunInProgressError('this council already has a run in progress');
    }

    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    this.activeRuns.add(councilId);
    this.repo.insertRun({
      id: runId,
      councilId,
      topic,
      status: 'running',
      // Snapshot the judge at start time, like participant rows.
      verdictProvider: AgentCliSchema.catch(COUNCIL_VERDICT_PROVIDER_DEFAULT).parse(
        council.verdictProvider,
      ),
      verdict: null,
      labelMap: null,
      error: null,
      startedAt,
      finishedAt: null,
    });

    const live: LiveParticipant[] = [];
    for (const p of participants) {
      const terminalId = `council-${runId}-${p.id}`;
      const row = this.repo.insertRunParticipant({
        id: randomUUID(),
        runId,
        participantId: p.id,
        name: p.name,
        provider: p.provider,
        perspective: p.perspective,
        status: 'running',
        terminalId,
        output: null,
        exitCode: null,
        error: null,
        label: null,
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
    for (const [i, p] of participants.entries()) {
      // Coalesce an unknown stored provider to the default, matching getAgentCli.
      const provider = AgentCliSchema.catch(AGENT_CLI_DEFAULT).parse(p.provider);
      this.spawnParticipant(councilId, runId, live[i]!, provider, p.perspective, topic, live);
    }
    return this.repo.hydrateRun(run);
  }

  private spawnParticipant(
    councilId: string,
    runId: string,
    lp: LiveParticipant,
    provider: AgentCli,
    perspective: string,
    topic: string,
    all: LiveParticipant[],
  ): void {
    const prompt = buildParticipantPrompt(perspective, topic);
    const spawned = this.terminal.spawnManagedRun(
      lp.terminalId,
      { ...oneshotCommand(provider, prompt), cwd: process.cwd() },
      {
        onData: (chunk) => {
          if (lp.bufferBytes >= CAPTURE_LIMIT_BYTES) {
            lp.truncated = true;
            return;
          }
          lp.buffer += chunk;
          lp.bufferBytes += Buffer.byteLength(chunk, 'utf8');
        },
        onExit: (exitCode) => this.settleParticipant(councilId, runId, lp, exitCode, all),
      },
    );

    if (!spawned.ok) {
      lp.settled = true;
      this.repo.updateRunParticipant(lp.rowId, {
        status: 'failed',
        error: spawned.error,
        finishedAt: new Date().toISOString(),
      });
      this.logger.warn(`council participant spawn failed (${lp.terminalId}): ${spawned.error}`);
      // The barrier still has to fire if this was the last unsettled participant.
      this.maybeSynthesize(councilId, runId, all);
      return;
    }

    const timeoutMs = this.config.councils.runTimeoutMs;
    lp.timeout = setTimeout(() => {
      lp.timedOut = true;
      this.terminal.killManagedRun(lp.terminalId); // onExit settles the row
    }, timeoutMs);
    lp.timeout.unref?.();
  }

  /**
   * Skip a still-running participant (e.g. a CLI hung on a missing API key):
   * kill its PTY and settle it as 'skipped' so the run stops waiting on it.
   * Synthesis proceeds as soon as the remaining participants finish. Returns
   * the updated run.
   */
  skipParticipant(councilId: string, runId: string, runParticipantId: string): CouncilRun {
    const run = this.repo.getRun(runId);
    if (!run || run.councilId !== councilId) {
      throw new CouncilDoesNotExistError(`run ${runId} does not exist on council ${councilId}`);
    }
    const live = this.liveRuns.get(runId);
    const lp = live?.find((p) => p.rowId === runParticipantId);
    if (!live || !lp || lp.settled) {
      throw new CouncilParticipantNotLiveError(
        `participant ${runParticipantId} is not running — nothing to skip`,
      );
    }
    lp.skipped = true;
    // The kill lands asynchronously and onExit settles the row. If the PTY is
    // already gone (spawned-then-died race), settle directly so the run can't
    // wait forever on a corpse.
    if (this.terminal.has(lp.terminalId)) {
      this.terminal.killManagedRun(lp.terminalId);
    } else {
      this.settleParticipant(councilId, runId, lp, -1, live);
    }
    return this.repo.hydrateRun(this.repo.getRun(runId)!);
  }

  private settleParticipant(
    councilId: string,
    runId: string,
    lp: LiveParticipant,
    exitCode: number,
    all: LiveParticipant[],
  ): void {
    if (lp.settled) return;
    lp.settled = true;
    if (lp.timeout) {
      clearTimeout(lp.timeout);
      lp.timeout = null;
    }

    let output = cleanPtyOutput(lp.buffer);
    if (lp.truncated) output += '\n\n[output truncated]';
    const status = lp.skipped
      ? 'skipped'
      : lp.timedOut
        ? 'timeout'
        : exitCode === 0 && output.trim()
          ? 'succeeded'
          : 'failed';
    this.repo.updateRunParticipant(lp.rowId, {
      status,
      output: output || null,
      exitCode,
      error:
        status === 'skipped'
          ? 'skipped by user'
          : status === 'timeout'
            ? `timed out after ${this.config.councils.runTimeoutMs}ms`
            : status === 'failed'
              ? exitCode === 0
                ? 'process exited without output'
                : `process exited with code ${exitCode}`
              : null,
      finishedAt: new Date().toISOString(),
    });

    this.maybeSynthesize(councilId, runId, all);
  }

  private maybeSynthesize(councilId: string, runId: string, all: LiveParticipant[]): void {
    if (!all.every((p) => p.settled)) return;
    this.synthesize(councilId, runId);
  }

  /**
   * Anonymize the settled outputs and hand them to the council's verdict
   * provider — a one-shot CLI run, watchable live like the participants'.
   * Never throws.
   */
  private synthesize(councilId: string, runId: string): void {
    try {
      this.repo.updateRun(runId, { status: 'synthesizing' });
      const rows = this.repo.listRunParticipants(runId);
      const succeeded = rows.filter((r) => r.status === 'succeeded' && r.output);

      if (succeeded.length < 2) {
        this.repo.updateRun(runId, {
          status: 'failed',
          error: `only ${succeeded.length} participant(s) produced output — at least 2 are needed to weigh options`,
          finishedAt: new Date().toISOString(),
        });
        this.finishRun(councilId, runId);
        return;
      }

      // Anonymize: shuffle (Fisher–Yates), then label in shuffled order so the
      // labels carry no positional hint of which participant is which. The
      // mapping is persisted BEFORE the verdict run — the UI de-anonymizes with
      // it even if the verdict dies.
      const shuffled = [...succeeded];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      const labelMap: Record<string, string> = {};
      const entries: Array<{ label: string; output: string | null }> = [];
      for (const [i, row] of shuffled.entries()) {
        const label = String.fromCharCode(65 + i); // A, B, C, …
        labelMap[label] = row.id;
        this.repo.updateRunParticipant(row.id, { label });
        entries.push({ label, output: row.output });
      }
      // Failed/timed-out participants surface as an explicit non-answer rather
      // than being silently omitted.
      const failedCount = rows.length - succeeded.length;
      for (let i = 0; i < failedCount; i++) {
        entries.push({ label: String.fromCharCode(65 + succeeded.length + i), output: null });
      }
      this.repo.updateRun(runId, { labelMap: JSON.stringify(labelMap) });

      const run = this.repo.getRun(runId)!;
      const provider = AgentCliSchema.catch(COUNCIL_VERDICT_PROVIDER_DEFAULT).parse(
        run.verdictProvider ?? COUNCIL_VERDICT_PROVIDER_DEFAULT,
      );
      // CLIs take a single prompt, so the moderator framing rides in front.
      const prompt = `${VERDICT_SYSTEM_PROMPT}\n\n${buildVerdictPrompt(run.topic, entries)}`;
      this.runVerdict(councilId, runId, provider, prompt);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`council run ${runId} synthesis failed: ${errorMsg}`);
      this.repo.updateRun(runId, {
        status: 'failed',
        error: `synthesis failed: ${errorMsg}`,
        finishedAt: new Date().toISOString(),
      });
      this.finishRun(councilId, runId);
    }
  }

  /** Run the verdict CLI in a managed PTY under the run's deterministic verdict attach id. */
  private runVerdict(councilId: string, runId: string, provider: AgentCli, prompt: string): void {
    const terminalId = `council-${runId}-verdict`;
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
            this.repo.updateRun(runId, {
              status: 'completed',
              verdict: output,
              finishedAt: new Date().toISOString(),
            });
          } else {
            // Surface the output tail so auth/setup errors are visible at a glance.
            const tail = output.trim() ? `: ${output.slice(-300).trim()}` : '';
            this.repo.updateRun(runId, {
              status: 'failed',
              error: state.timedOut
                ? `verdict (${provider}) timed out after ${this.config.councils.runTimeoutMs}ms`
                : `verdict (${provider}) exited with code ${exitCode}${tail}`,
              finishedAt: new Date().toISOString(),
            });
          }
          this.finishRun(councilId, runId);
        },
      },
    );

    if (!spawned.ok) {
      this.repo.updateRun(runId, {
        status: 'failed',
        error: `verdict (${provider}) failed to start: ${spawned.error}`,
        finishedAt: new Date().toISOString(),
      });
      this.finishRun(councilId, runId);
      return;
    }

    state.timeout = setTimeout(() => {
      state.timedOut = true;
      this.terminal.killManagedRun(terminalId); // onExit settles the run
    }, this.config.councils.runTimeoutMs);
    state.timeout.unref?.();
  }

  private finishRun(councilId: string, runId: string): void {
    this.activeRuns.delete(councilId);
    this.liveRuns.delete(runId);
  }
}
