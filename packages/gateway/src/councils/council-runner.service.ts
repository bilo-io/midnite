import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AGENT_CLI_DEFAULT,
  AgentCliSchema,
  COUNCIL_FORMAT_DEFAULT,
  COUNCIL_FORMATS_META,
  COUNCIL_SYNTH_PROVIDER_DEFAULT,
  CouncilFormatSchema,
  type AgentCli,
  type CouncilFormat,
  type CouncilRun,
  type MidniteConfig,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { TerminalService } from '../terminal/terminal.service';
import { cleanPtyOutput } from '../terminal/lib/clean-output';
import { oneshotCommand } from '../terminal/lib/oneshot-command';
import { CouncilDoesNotExistError } from './councils.service';
import { CouncilsRepository } from './councils.repository';
import {
  SYNTH_SYSTEM_PROMPT_ANONYMIZED,
  SYNTH_SYSTEM_PROMPT_ATTRIBUTED,
  buildMemberPrompt,
  buildSynthesisPrompt,
} from './lib/council-prompts';

export class CouncilRunInProgressError extends Error {}
export class CouncilEmptyError extends Error {}
export class CouncilMemberNotLiveError extends Error {}
export class CouncilRunNotRetryableError extends Error {}

// Cap the per-member capture buffer; anything past it is dropped (the tail of a
// runaway TUI redraw, not the response) and the truncation is flagged.
const CAPTURE_LIMIT_BYTES = 2 * 1024 * 1024;

interface LiveMember {
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
 * Orchestrates a council run: spawns each member's one-shot CLI in a managed PTY
 * (watchable over the normal terminal WS), captures and cleans their responses,
 * and — once all settle — hands the captured responses to the council's
 * synthesizer CLI, which distils them in the run's chosen *format*. Whether the
 * synthesis attributes members by name or anonymizes them (shuffle + label) is
 * decided per-format at synthesis-prompt-build time, so a finished run can be
 * re-synthesized in another format over the same captured responses.
 */
@Injectable()
export class CouncilRunnerService implements OnModuleInit {
  private readonly logger = new Logger(CouncilRunnerService.name);
  // One live run per council; in-memory.
  private readonly activeRuns = new Set<string>();
  // Live per-member state by run id, so a viewer can skip a hung CLI.
  private readonly liveRuns = new Map<string, LiveMember[]>();

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
      for (const m of this.repo.listRunMembers(run.id)) {
        if (m.status === 'running') {
          this.repo.updateRunMember(m.id, {
            status: 'failed',
            error: 'gateway restarted mid-run',
            finishedAt: new Date().toISOString(),
          });
        }
      }
      this.logger.warn(`marked stale council run ${run.id} as failed (gateway restart)`);
    }
  }

  startRun(councilId: string, prompt: string, format?: CouncilFormat): CouncilRun {
    const council = this.repo.getCouncil(councilId);
    if (!council) throw new CouncilDoesNotExistError(`council ${councilId} does not exist`);
    const members = this.repo.listMembers(councilId);
    if (members.length < 1) {
      throw new CouncilEmptyError('a council run needs at least 1 member');
    }
    if (this.activeRuns.has(councilId)) {
      throw new CouncilRunInProgressError('this council already has a run in progress');
    }

    // Coalesce the requested format (or the council default) to a known format.
    const runFormat = CouncilFormatSchema.catch(COUNCIL_FORMAT_DEFAULT).parse(
      format ?? council.defaultFormat,
    );
    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    this.activeRuns.add(councilId);
    this.repo.insertRun({
      id: runId,
      councilId,
      prompt,
      format: runFormat,
      status: 'running',
      // Snapshot the synthesizer at start time, like member rows.
      synthProvider: AgentCliSchema.catch(COUNCIL_SYNTH_PROVIDER_DEFAULT).parse(
        council.synthProvider,
      ),
      synthesis: null,
      error: null,
      startedAt,
      finishedAt: null,
    });

    const live: LiveMember[] = [];
    for (const m of members) {
      const terminalId = `council-${runId}-${m.id}`;
      const row = this.repo.insertRunMember({
        id: randomUUID(),
        runId,
        memberId: m.id,
        name: m.name,
        provider: m.provider,
        role: m.role,
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
    for (const [i, m] of members.entries()) {
      // Coalesce an unknown stored provider to the default, matching getAgentCli.
      const provider = AgentCliSchema.catch(AGENT_CLI_DEFAULT).parse(m.provider);
      this.spawnMember(councilId, runId, live[i]!, provider, m.role, prompt, runFormat, live);
    }
    return this.repo.hydrateRun(run);
  }

  private spawnMember(
    councilId: string,
    runId: string,
    lm: LiveMember,
    provider: AgentCli,
    role: string,
    prompt: string,
    format: CouncilFormat,
    all: LiveMember[],
  ): void {
    const memberPrompt = buildMemberPrompt(format, role, prompt);
    const spawned = this.terminal.spawnManagedRun(
      lm.terminalId,
      { ...oneshotCommand(provider, memberPrompt), cwd: process.cwd() },
      {
        onData: (chunk) => {
          if (lm.bufferBytes >= CAPTURE_LIMIT_BYTES) {
            lm.truncated = true;
            return;
          }
          lm.buffer += chunk;
          lm.bufferBytes += Buffer.byteLength(chunk, 'utf8');
        },
        onExit: (exitCode) => this.settleMember(councilId, runId, lm, exitCode, all),
      },
    );

    if (!spawned.ok) {
      lm.settled = true;
      this.repo.updateRunMember(lm.rowId, {
        status: 'failed',
        error: spawned.error,
        finishedAt: new Date().toISOString(),
      });
      this.logger.warn(`council member spawn failed (${lm.terminalId}): ${spawned.error}`);
      // The barrier still has to fire if this was the last unsettled member.
      this.maybeSynthesize(councilId, runId, all);
      return;
    }

    const timeoutMs = this.config.councils.runTimeoutMs;
    lm.timeout = setTimeout(() => {
      lm.timedOut = true;
      this.terminal.killManagedRun(lm.terminalId); // onExit settles the row
    }, timeoutMs);
    lm.timeout.unref?.();
  }

  /**
   * Skip a still-running member (e.g. a CLI hung on a missing API key): kill its
   * PTY and settle it as 'skipped' so the run stops waiting on it. Synthesis
   * proceeds as soon as the remaining members finish. Returns the updated run.
   */
  skipMember(councilId: string, runId: string, runMemberId: string): CouncilRun {
    const run = this.repo.getRun(runId);
    if (!run || run.councilId !== councilId) {
      throw new CouncilDoesNotExistError(`run ${runId} does not exist on council ${councilId}`);
    }
    const live = this.liveRuns.get(runId);
    const lm = live?.find((m) => m.rowId === runMemberId);
    if (!live || !lm || lm.settled) {
      throw new CouncilMemberNotLiveError(
        `member ${runMemberId} is not running — nothing to skip`,
      );
    }
    lm.skipped = true;
    // The kill lands asynchronously and onExit settles the row. If the PTY is
    // already gone (spawned-then-died race), settle directly so the run can't
    // wait forever on a corpse.
    if (this.terminal.has(lm.terminalId)) {
      this.terminal.killManagedRun(lm.terminalId);
    } else {
      this.settleMember(councilId, runId, lm, -1, live);
    }
    return this.repo.hydrateRun(this.repo.getRun(runId)!);
  }

  /**
   * Re-run one settled member of a finished run: reset its row, respawn its
   * one-shot CLI, and re-synthesize when it settles. Like a brainstorm retry it
   * re-syncs the run snapshot (name/provider/role) from the *current* council
   * member first, so fixing a failed member's provider/role and retrying actually
   * re-runs with the new config. Falls back to the existing snapshot if the member
   * has since been removed.
   */
  retryMember(councilId: string, runId: string, runMemberId: string): CouncilRun {
    const run = this.repo.getRun(runId);
    if (!run || run.councilId !== councilId) {
      throw new CouncilDoesNotExistError(`run ${runId} does not exist on council ${councilId}`);
    }
    if (this.activeRuns.has(councilId) || run.status === 'running' || run.status === 'synthesizing') {
      throw new CouncilRunInProgressError('this council already has a run in progress');
    }
    const row = this.repo.listRunMembers(runId).find((r) => r.id === runMemberId);
    if (!row || row.status === 'running') {
      throw new CouncilRunNotRetryableError(`member ${runMemberId} is not in a retryable state`);
    }

    // Re-sync the snapshot from the live council member (edits made since the run
    // are the whole point of a retry); fall back to the snapshot if removed.
    const current = this.repo.getMember(row.memberId);
    const snapshot =
      current && current.councilId === councilId
        ? { name: current.name, provider: current.provider, role: current.role }
        : { name: row.name, provider: row.provider, role: row.role };

    this.activeRuns.add(councilId);
    this.repo.updateRun(runId, { status: 'running', error: null, synthesis: null, finishedAt: null });
    this.repo.updateRunMember(row.id, {
      ...snapshot,
      status: 'running',
      output: null,
      exitCode: null,
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });

    const lm: LiveMember = {
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
    // Only the retried member is live; the others' persisted rows feed synthesis
    // unchanged once it settles.
    const live = [lm];
    this.liveRuns.set(runId, live);
    const provider = AgentCliSchema.catch(AGENT_CLI_DEFAULT).parse(snapshot.provider);
    const format = CouncilFormatSchema.catch(COUNCIL_FORMAT_DEFAULT).parse(run.format);
    this.spawnMember(councilId, runId, lm, provider, snapshot.role, run.prompt, format, live);
    return this.repo.hydrateRun(this.repo.getRun(runId)!);
  }

  /**
   * Re-synthesize a finished run from its persisted responses — optionally in a
   * new format — with the council's *current* synthesizer. This is the heart of
   * the feature: switch the format (brainstorm → debate → analyse …) and re-run
   * the cheap synthesis step without re-running the members. Also the rate-limit
   * escape hatch (switch the synthesizer provider and retry).
   */
  retrySynthesis(councilId: string, runId: string, format?: CouncilFormat): CouncilRun {
    const run = this.repo.getRun(runId);
    if (!run || run.councilId !== councilId) {
      throw new CouncilDoesNotExistError(`run ${runId} does not exist on council ${councilId}`);
    }
    if (this.activeRuns.has(councilId) || run.status === 'running' || run.status === 'synthesizing') {
      throw new CouncilRunInProgressError('this council already has a run in progress');
    }

    const council = this.repo.getCouncil(councilId);
    const provider = AgentCliSchema.catch(COUNCIL_SYNTH_PROVIDER_DEFAULT).parse(
      council?.synthProvider,
    );
    const nextFormat = CouncilFormatSchema.catch(COUNCIL_FORMAT_DEFAULT).parse(format ?? run.format);
    this.repo.updateRun(runId, { synthProvider: provider, format: nextFormat });

    this.activeRuns.add(councilId);
    this.liveRuns.set(runId, []);
    this.synthesize(councilId, runId);
    return this.repo.hydrateRun(this.repo.getRun(runId)!);
  }

  private settleMember(
    councilId: string,
    runId: string,
    lm: LiveMember,
    exitCode: number,
    all: LiveMember[],
  ): void {
    if (lm.settled) return;
    lm.settled = true;
    if (lm.timeout) {
      clearTimeout(lm.timeout);
      lm.timeout = null;
    }

    let output = cleanPtyOutput(lm.buffer);
    if (lm.truncated) output += '\n\n[output truncated]';
    const status = lm.skipped
      ? 'skipped'
      : lm.timedOut
        ? 'timeout'
        : exitCode === 0 && output.trim()
          ? 'succeeded'
          : 'failed';
    this.repo.updateRunMember(lm.rowId, {
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

  private maybeSynthesize(councilId: string, runId: string, all: LiveMember[]): void {
    if (!all.every((m) => m.settled)) return;
    this.synthesize(councilId, runId);
  }

  /**
   * Hand the captured responses to the council's synthesizer — a one-shot CLI
   * run, watchable live like the members'. The run's format decides the synthesis
   * task and whether members are attributed or anonymized (the latter applied here
   * at build time, never at capture). Never throws.
   */
  private synthesize(councilId: string, runId: string): void {
    try {
      this.repo.updateRun(runId, {
        status: 'synthesizing',
        error: null,
        synthesis: null,
        finishedAt: null,
      });
      const run = this.repo.getRun(runId)!;
      const rows = this.repo.listRunMembers(runId);
      // Always carry member identity + raw output; anonymization is applied in
      // buildSynthesisPrompt, not here. A succeeded row with output carries its
      // response; everything else is a null entry the synthesizer reads as "no
      // response".
      const entries = rows.map((r, i) => ({
        id: r.id,
        name: r.name.trim() || `Member ${i + 1}`,
        role: r.role,
        output: r.status === 'succeeded' && r.output ? r.output : null,
      }));

      const format = CouncilFormatSchema.catch(COUNCIL_FORMAT_DEFAULT).parse(run.format);
      const meta = COUNCIL_FORMATS_META[format];
      const producedCount = entries.filter((e) => e.output !== null).length;
      // Anonymized formats weigh positions against each other, so they need ≥2;
      // attributed formats can work over a single response.
      const minOutputs = meta.anonymize ? 2 : 1;
      if (producedCount < minOutputs) {
        const error =
          producedCount === 0
            ? 'no member produced a response — nothing to synthesize'
            : `only ${producedCount} member produced a response — the ${meta.label} format weighs anonymized positions and needs at least 2. Re-synthesize in an attributing format (e.g. Brainstorm) to use the single response.`;
        this.repo.updateRun(runId, { status: 'failed', error, finishedAt: new Date().toISOString() });
        this.finishRun(councilId, runId);
        return;
      }

      const council = this.repo.getCouncil(councilId);
      if (format === 'custom' && !(council?.customPrompt ?? '').trim()) {
        this.repo.updateRun(runId, {
          status: 'failed',
          error: 'the Custom format needs a synthesis prompt — set one on the council first',
          finishedAt: new Date().toISOString(),
        });
        this.finishRun(councilId, runId);
        return;
      }

      const provider = AgentCliSchema.catch(COUNCIL_SYNTH_PROVIDER_DEFAULT).parse(
        run.synthProvider ?? COUNCIL_SYNTH_PROVIDER_DEFAULT,
      );
      const { body, labelMap } = buildSynthesisPrompt(format, run.prompt, entries, {
        anonymize: meta.anonymize,
        customPrompt: council?.customPrompt ?? undefined,
      });
      // CLIs take a single prompt, so the synthesizer framing rides in front.
      const system = meta.anonymize ? SYNTH_SYSTEM_PROMPT_ANONYMIZED : SYNTH_SYSTEM_PROMPT_ATTRIBUTED;
      const prompt = `${system}\n\n${body}`;
      this.runSynthesis(councilId, runId, provider, { format, anonymized: meta.anonymize, labelMap }, prompt);
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

  /** Run the synthesizer CLI in a managed PTY under the run's deterministic synth attach id. */
  private runSynthesis(
    councilId: string,
    runId: string,
    provider: AgentCli,
    synth: { format: CouncilFormat; anonymized: boolean; labelMap?: Record<string, string> },
    prompt: string,
  ): void {
    const terminalId = `council-${runId}-synth`;
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
            // Archive this format's result (with its anonymization mapping) so
            // re-synthesizing in another format keeps it.
            this.repo.recordSynthesis(runId, {
              format: synth.format,
              synthesis: output,
              synthProvider: provider,
              anonymized: synth.anonymized,
              labelMap: synth.labelMap,
              finishedAt,
            });
          } else {
            // Surface the output tail so auth/setup errors are visible at a glance.
            const tail = output.trim() ? `: ${output.slice(-300).trim()}` : '';
            this.repo.updateRun(runId, {
              status: 'failed',
              error: state.timedOut
                ? `synthesis (${provider}) timed out after ${this.config.councils.runTimeoutMs}ms`
                : `synthesis (${provider}) exited with code ${exitCode}${tail}`,
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
        error: `synthesis (${provider}) failed to start: ${spawned.error}`,
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
