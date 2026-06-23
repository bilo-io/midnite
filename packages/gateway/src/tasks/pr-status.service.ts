import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseGithubPr, type MidniteConfig, type PrStatus, type Task } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { mapWithConcurrency } from '../lib/map-with-concurrency';
import { mapGhPrJson, mapRestPrJson, type PrStatusCore } from './lib/pr-status-map';
import { TasksRepository } from './tasks.repository';
import { TaskEventBus } from './task-event-bus';
import type { TaskRow } from '../db/schema';

const execFileAsync = promisify(execFile);

const GH_TIMEOUT_MS = 8000;
const MAX_FETCH_BYTES = 256 * 1024;
const USER_AGENT =
  'Mozilla/5.0 (compatible; midnite-pr-status/1.0; +https://github.com/bilo-io/midnite)';

/**
 * Phase 22 Theme C — resolve a task's GitHub PR (from its `prUrl`) to a live
 * {@link PrStatus} and keep it fresh. A single gateway-owned poller (mirroring
 * the agent-pool scheduler: OnModuleInit/Destroy, `setInterval` + `unref`, a
 * reentrancy guard) refreshes only tasks whose PR isn't merged/closed; an
 * on-demand {@link refresh} backs `POST /tasks/:id/pr/refresh`. Resolution is
 * **gh-first** (the user's auth → private repos) with an anonymous `api.github.com`
 * REST fallback for public repos, and **fail-open**: a missing `gh` / unauth'd
 * private repo / network error logs a warn and leaves the last-known status,
 * never throwing into task flow.
 */
@Injectable()
export class PrStatusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrStatusService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksRepository) private readonly repo: TasksRepository,
    @Inject(TaskEventBus) private readonly bus: TaskEventBus,
  ) {}

  onModuleInit(): void {
    if (!this.config.prStatus.enabled) {
      this.logger.log('PR-status polling disabled — poller not started');
      return;
    }
    const ms = this.config.prStatus.pollIntervalMs;
    this.timer = setInterval(() => void this.poll(), ms);
    this.timer.unref?.();
    this.logger.log(`PR-status poller started (interval=${ms}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Refresh every task whose PR isn't yet terminal, with bounded concurrency.
   * Public so tests can drive a cycle directly. Never throws (per-row failures
   * are swallowed by {@link refreshRow}); a re-entrant call is a no-op.
   */
  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const rows = this.repo.listTasksWithUnmergedPr();
      if (rows.length === 0) return;
      await mapWithConcurrency(rows, this.config.prStatus.pollConcurrency, (row) =>
        this.refreshRow(row),
      );
    } finally {
      this.running = false;
    }
  }

  /**
   * On-demand refresh of one task's PR status, returning the (re-hydrated) task.
   * 404s an unknown task; a task without a parseable PR URL is a no-op that
   * returns the task unchanged.
   */
  async refresh(taskId: string): Promise<Task> {
    const row = this.repo.getTask(taskId);
    if (!row) throw new NotFoundException(`task ${taskId} not found`);
    await this.refreshRow(row);
    return this.repo.hydrate(this.repo.getTask(taskId)!);
  }

  /** Fetch + persist one row's PR status, broadcasting `task.updated` on a change. */
  private async refreshRow(row: TaskRow): Promise<void> {
    if (!row.prUrl) return;
    const parsed = parseGithubPr(row.prUrl);
    if (!parsed) return;
    const status = await this.fetchStatus(row.prUrl, parsed.repo, parsed.prNumber);
    if (!status) return; // fail-open — keep the last-known status

    const prev = this.repo.getPrStatusRow(row.id);
    this.repo.upsertPrStatus({
      taskId: row.id,
      url: status.url,
      number: status.number,
      state: status.state,
      checks: status.checks,
      reviewDecision: status.reviewDecision ?? null,
      fetchedAt: status.fetchedAt,
    });

    // Only nudge the board when something visible actually changed.
    const changed =
      !prev ||
      prev.state !== status.state ||
      prev.checks !== status.checks ||
      (prev.reviewDecision ?? undefined) !== status.reviewDecision;
    if (changed) {
      this.bus.emit({
        type: 'task.updated',
        at: new Date().toISOString(),
        task: this.repo.hydrate(this.repo.getTask(row.id)!),
      });
    }
  }

  /** gh-first then anonymous REST. Stamps url/number/fetchedAt onto the core verdict. */
  async fetchStatus(url: string, repo: string, number: number): Promise<PrStatus | null> {
    const core = (await this.ghView(url)) ?? (await this.ghRest(repo, number));
    if (!core) {
      this.logger.warn(`pr-status: could not resolve ${url} (gh + REST both failed)`);
      return null;
    }
    return { ...core, url, number, fetchedAt: new Date().toISOString() };
  }

  // ---- network primitives (protected so the orchestration is unit-testable) ----

  /** Resolve a PR via `gh pr view` (uses the user's auth). null on any failure. */
  protected async ghView(url: string): Promise<PrStatusCore | null> {
    try {
      const { stdout } = await execFileAsync(
        'gh',
        ['pr', 'view', url, '--json', 'state,isDraft,statusCheckRollup,reviewDecision'],
        { timeout: GH_TIMEOUT_MS, maxBuffer: MAX_FETCH_BYTES },
      );
      return mapGhPrJson(JSON.parse(stdout));
    } catch {
      return null;
    }
  }

  /** Anonymous fallback for a public PR when `gh` is absent or errors. */
  protected async ghRest(repo: string, number: number): Promise<PrStatusCore | null> {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${number}`, {
        signal: AbortSignal.timeout(GH_TIMEOUT_MS),
        headers: { 'user-agent': USER_AGENT, accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return null;
      return mapRestPrJson(await res.json());
    } catch {
      return null;
    }
  }
}
