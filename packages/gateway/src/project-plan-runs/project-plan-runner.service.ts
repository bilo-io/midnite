import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MidniteConfig, OverviewRunResponse, StartOverviewRunResponse } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { AgentsService } from '../agents/agents.service';
import { ProjectDocsService } from '../project-docs/project-docs.service';
import { ProjectsService } from '../projects/projects.service';
import { TerminalService } from '../terminal/terminal.service';
import { cleanPtyOutput } from '../terminal/lib/clean-output';
import { oneshotCommand } from '../terminal/lib/oneshot-command';
import { buildOverviewPrompt } from './lib/overview-prompt';
import { ProjectPlanRunsRepository } from './project-plan-runs.repository';

export class ProjectPlanRunDoesNotExistError extends Error {}

// Mirrors CouncilRunnerService's per-member cap — the tail of a runaway TUI
// redraw, not the response.
const CAPTURE_LIMIT_BYTES = 2 * 1024 * 1024;

interface LiveRun {
  buffer: string;
  bufferBytes: number;
  truncated: boolean;
  timedOut: boolean;
  settled: boolean;
  timeout: NodeJS.Timeout | null;
}

/**
 * Draft-plan Stage 1: draft a project's high-level execution-plan overview live
 * in a managed PTY (watchable over the normal terminal WS, like a council run),
 * rather than a quiet structured API call — the user sees exactly what the CLI
 * produces and can review/approve before Stage 2 (the existing dependency-aware
 * breakdown flow) turns it into tasks. Mirrors CouncilRunnerService's
 * spawn/capture/clean/timeout shape, minus the multi-member synthesis step.
 */
@Injectable()
export class ProjectPlanRunnerService implements OnModuleInit {
  private readonly logger = new Logger(ProjectPlanRunnerService.name);
  private readonly liveRuns = new Map<string, LiveRun>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(ProjectPlanRunsRepository) private readonly repo: ProjectPlanRunsRepository,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(ProjectDocsService) private readonly docs: ProjectDocsService,
    @Inject(AgentsService) private readonly agents: AgentsService,
    @Inject(TerminalService) private readonly terminal: TerminalService,
  ) {}

  // PTYs die with the gateway process, so any run still 'running' after a
  // restart is dead (mirrors CouncilRunnerService.onModuleInit).
  onModuleInit(): void {
    for (const run of this.repo.listStaleRuns()) {
      this.repo.update(run.id, {
        status: 'error',
        error: 'gateway restarted mid-run',
        finishedAt: new Date().toISOString(),
      });
      this.logger.warn(`marked stale project plan run ${run.id} as error (gateway restart)`);
    }
  }

  /**
   * Kick off the overview draft: build the prompt from the project +
   * (optionally) the content of `docIds`, spawn the CLI in a managed PTY under a
   * deterministic attach id, and return immediately so the caller can mount
   * `LiveTerminal` right away — the run settles asynchronously.
   */
  startOverviewRun(projectId: string, docIds: string[]): StartOverviewRunResponse {
    const project = this.projects.getProject(projectId); // 404 if missing
    const allDocs = this.docs.listDocs(projectId);
    const selected = docIds.length
      ? allDocs.filter((d) => docIds.includes(d.id))
      : [];
    const prompt = buildOverviewPrompt(project, selected);

    const runId = randomUUID();
    const terminalId = `project-plan-${runId}`;
    const startedAt = new Date().toISOString();
    this.repo.create({
      id: runId,
      projectId,
      status: 'running',
      terminalId,
      output: null,
      error: null,
      startedAt,
      finishedAt: null,
    });

    this.spawn(runId, terminalId, prompt);
    return { runId, terminalId };
  }

  /** Current status/result of an overview run, for the client's poll loop. */
  getOverviewRun(projectId: string, runId: string): OverviewRunResponse {
    const row = this.repo.get(runId);
    if (!row || row.projectId !== projectId) {
      throw new ProjectPlanRunDoesNotExistError(
        `overview run ${runId} does not exist on project ${projectId}`,
      );
    }
    return {
      status: row.status as OverviewRunResponse['status'],
      output: row.output ?? undefined,
      error: row.error ?? undefined,
    };
  }

  private spawn(runId: string, terminalId: string, prompt: string): void {
    const provider = this.agents.getAgentCli();
    const live: LiveRun = {
      buffer: '',
      bufferBytes: 0,
      truncated: false,
      timedOut: false,
      settled: false,
      timeout: null,
    };
    this.liveRuns.set(runId, live);

    const spawned = this.terminal.spawnManagedRun(
      terminalId,
      { ...oneshotCommand(provider, prompt), cwd: process.cwd() },
      {
        onData: (chunk) => {
          if (live.bufferBytes >= CAPTURE_LIMIT_BYTES) {
            live.truncated = true;
            return;
          }
          live.buffer += chunk;
          live.bufferBytes += Buffer.byteLength(chunk, 'utf8');
        },
        onExit: (exitCode) => this.settle(runId, exitCode, live),
      },
    );

    if (!spawned.ok) {
      live.settled = true;
      this.liveRuns.delete(runId);
      this.repo.update(runId, {
        status: 'error',
        error: `failed to start (${provider}): ${spawned.error}`,
        finishedAt: new Date().toISOString(),
      });
      this.logger.warn(`project plan overview spawn failed (${terminalId}): ${spawned.error}`);
      return;
    }

    const timeoutMs = this.config.councils.runTimeoutMs;
    live.timeout = setTimeout(() => {
      live.timedOut = true;
      this.terminal.killManagedRun(terminalId); // onExit settles the row
    }, timeoutMs);
    live.timeout.unref?.();
  }

  private settle(runId: string, exitCode: number, live: LiveRun): void {
    if (live.settled) return;
    live.settled = true;
    if (live.timeout) {
      clearTimeout(live.timeout);
      live.timeout = null;
    }
    this.liveRuns.delete(runId);

    let output = cleanPtyOutput(live.buffer);
    if (live.truncated) output += '\n\n[output truncated]';
    const succeeded = !live.timedOut && exitCode === 0 && output.trim().length > 0;
    this.repo.update(runId, {
      status: succeeded ? 'done' : 'error',
      output: output || null,
      error: succeeded
        ? null
        : live.timedOut
          ? `timed out after ${this.config.councils.runTimeoutMs}ms`
          : exitCode === 0
            ? 'process exited without output'
            : `process exited with code ${exitCode}`,
      finishedAt: new Date().toISOString(),
    });
  }
}
