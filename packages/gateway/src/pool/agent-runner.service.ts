import { Inject, Injectable, Logger, Optional, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { CheckResult, MidniteConfig, Task } from '@midnite/shared';
import { resolveChecksForRepo } from '@midnite/shared';
import { KnowledgeService } from '../agent/knowledge.service';
import { UrlContextService } from '../agent/url-context.service';
import { ChecksService } from '../checks/checks.service';
import { MIDNITE_CONFIG } from '../config.token';
import { MetricsService } from '../metrics/metrics.service';
import { ReposService } from '../repos/repos.service';
import { TasksService } from '../tasks/tasks.service';
import { TerminalService } from '../terminal/terminal.service';
import { AgentPoolService } from './agent-pool.service';
import { appendRepoConventions } from './lib/build-agent-prompt';

/**
 * Drives a single task through an autonomous agent run: claim a slot, move the
 * task to `wip`, spawn the seeded agent session, and arm a timeout. The session
 * is reaped (and the slot freed) either by the Stop hook marking the task done
 * (Phase B) or by the PTY exiting — see {@link onExit}.
 *
 * It also owns **boot recovery** ({@link onModuleInit}): tasks left `wip`/`waiting`
 * by a previous process. With the `pty` backend their sessions died, so they're
 * requeued; with the durable `tmux` backend a session may have survived, so the
 * still-live ones are reattached instead of orphaned (Phase 17 §C2). Recovery
 * lives here, not in the pool, because reattach needs the same slot + timeout +
 * onExit wiring as a fresh {@link start}; it runs after the pool initialises and
 * before the scheduler's first tick (dependency order).
 */
/** Max characters of per-check output included in the auto-fix seed prompt. */
const FIX_OUTPUT_CAP = 800;

/**
 * Build the seed prompt for an auto-fix re-spawn. Folds in the PR URL and
 * the truncated per-check failure output so the agent knows exactly what to fix.
 * Raw output is trimmed to FIX_OUTPUT_CAP to stay within a reasonable prompt
 * size without losing the most recent (and most relevant) failure detail.
 */
function buildFixPrompt(prUrl: string, results: CheckResult[]): string {
  const failed = results.filter((r) => !r.passed);
  const lines: string[] = [
    `The PR you opened has failing checks: ${prUrl}`,
    'Fix the failures below and update the existing PR.',
    '',
  ];
  for (const r of failed) {
    lines.push(`## ${r.name} (exit ${r.exitCode ?? 'killed'})`);
    const raw = r.output.trim();
    if (raw.length > FIX_OUTPUT_CAP) {
      lines.push('…' + raw.slice(-FIX_OUTPUT_CAP));
    } else {
      lines.push(raw || '(no output)');
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

@Injectable()
export class AgentRunnerService implements OnModuleInit {
  private readonly logger = new Logger(AgentRunnerService.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(AgentPoolService) private readonly pool: AgentPoolService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(TerminalService) private readonly terminal: TerminalService,
    @Inject(UrlContextService) private readonly urlContext: UrlContextService,
    @Inject(ReposService) private readonly repos: ReposService,
    // Optional so the runner's unit specs construct it positionally without a
    // stub; Nest provides it in production (AgentModule exports it). Phase 15 D.
    @Optional() @Inject(KnowledgeService) private readonly knowledge?: KnowledgeService,
    // Optional so existing unit specs that build AgentRunnerService directly need
    // no ChecksService stub. When absent the gate is skipped (fail-open). Phase 30 B2.
    @Optional() @Inject(ChecksService) private readonly checks?: ChecksService,
    // Optional — MetricsService wires in production; absent in unit specs. Phase 22 A3.
    @Optional() @Inject(MetricsService) private readonly metrics?: MetricsService,
  ) {}

  /** Per-task metric run tracking — id + wall-clock start for duration. */
  private readonly metricRunIds = new Map<string, { id: string; startedAt: number }>();

  /**
   * Reconcile tasks left `wip`/`waiting` by a previous gateway process. For the
   * `pty` backend every such session is dead, so all are requeued (slots start
   * idle, the scheduler re-runs them). For the durable `tmux` backend, sessions
   * that survived the restart are reattached (the run resumes, not requeued);
   * sessions that died while we were down are requeued; and any live `midnite-*`
   * session with no owning `wip`/`waiting` task is reaped as a stray.
   */
  onModuleInit(): void {
    const stale = this.tasks
      .listTasks()
      .filter((t) => t.status === 'wip' || t.status === 'waiting');

    if (!this.terminal.isDurable()) {
      for (const task of stale) this.safeRequeue(task.id);
      if (stale.length > 0) {
        this.logger.log(`reconciled ${stale.length} orphaned wip/waiting task(s) → todo`);
      }
      return;
    }

    const live = new Set(this.terminal.liveSessionIds());
    let reattached = 0;
    let requeued = 0;
    for (const task of stale) {
      const recovered = live.has(task.id) && this.reattach(task);
      live.delete(task.id); // claimed (reattached) or dead (requeued) — never a stray
      if (recovered) {
        reattached++;
      } else {
        // Its session died with the previous process — requeue and forget its
        // (now-orphaned) hook secret so the persisted row doesn't linger.
        this.terminal.discardSession(task.id);
        this.safeRequeue(task.id);
        requeued++;
      }
    }
    // Live sessions whose task is gone/finished: don't double-spawn — reap them.
    for (const id of live) this.terminal.discardSession(id);
    if (reattached > 0 || requeued > 0 || live.size > 0) {
      this.logger.log(
        `tmux recovery: reattached ${reattached}, requeued ${requeued}, discarded ${live.size} stray session(s)`,
      );
    }
  }

  /** Reattach a still-live tmux session for an in-flight task: re-claim its slot,
   *  rewire onExit + timeout, and leave it `wip`. Returns false (caller requeues)
   *  if no slot is free or the session couldn't be reattached. */
  private reattach(task: Task): boolean {
    if (this.pool.acquire(task.id) === null) return false;
    const result = this.terminal.reattachAgentSession(task.id, {
      onExit: (code) => this.onExit(task.id, code),
    });
    if (!result.ok) {
      this.logger.warn(`reattach failed for ${task.id}: ${result.error}`);
      this.pool.release(task.id);
      return false;
    }
    this.pool.setPid(task.id, result.pid);
    this.armTimeout(task.id);
    this.logger.log(`reattached agent run for task ${task.id} (pid ${result.pid})`);
    return true;
  }

  /** Claim a slot and spawn an agent session for `task`. Returns false (leaving
   *  the task in `todo`) if no slot was free or the spawn failed. */
  async start(task: Task): Promise<boolean> {
    if (this.pool.acquire(task.id) === null) return false;
    try {
      // Fold any linked GitHub issue/PR + URL context into the seed prompt
      // (best-effort, fail-open — never blocks the run). Phase 15 Theme B.
      const enriched = await this.urlContext.enrich(task.prompt?.trim() || task.title);
      // Fold in relevant watched "knowledge files" the plan model picks for this
      // task (best-effort, fail-open). Phase 15 Theme D.
      const withKnowledge = this.knowledge ? await this.knowledge.enrich(enriched, task) : enriched;
      // Append the target repo's branch-naming / PR-body conventions, if any
      // (Phase 13 Theme E). Unknown/unassigned repo → prompt unchanged.
      const repo = task.repo ? this.repos.findByName(task.repo) : undefined;
      const prompt = appendRepoConventions(withKnowledge, repo);
      this.tasks.startTask(task.id);
      const result = this.terminal.spawnAgentSession(
        task.id,
        { prompt },
        { onExit: (code) => this.onExit(task.id, code) },
      );
      if (!result.ok) {
        this.logger.warn(`agent session spawn failed for ${task.id}: ${result.error}`);
        this.tasks.requeue(task.id);
        this.pool.release(task.id);
        return false;
      }
      this.pool.setPid(task.id, result.pid);
      this.armTimeout(task.id);
      this.logger.log(`started agent run for task ${task.id} (pid ${result.pid})`);
      const metricId = randomUUID();
      this.metrics?.recordRunStart(metricId, task.id, task.retryCount, task.repo);
      this.metricRunIds.set(task.id, { id: metricId, startedAt: Date.now() });
      return true;
    } catch (err) {
      this.logger.error(
        `failed to start agent run for ${task.id}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      this.safeRequeue(task.id);
      this.pool.release(task.id);
      return false;
    }
  }

  /** The Stop hook marked the task done: clear the timeout, free the slot, and
   *  reap the now-idle session. Status is already `done` (set by the hook), so
   *  the PTY's onExit won't requeue it. */
  complete(taskId: string): void {
    this.endMetricRun(taskId, 'done');
    this.clearRunTimeout(taskId);
    this.pool.release(taskId);
    this.terminal.killManagedRun(taskId);
  }

  private endMetricRun(taskId: string, outcome: 'done' | 'abandoned' | 'failed' | 'cancelled'): void {
    const entry = this.metricRunIds.get(taskId);
    if (!entry) return;
    this.metricRunIds.delete(taskId);
    this.metrics?.recordRunEnd(entry.id, outcome, Date.now() - entry.startedAt);
  }

  /**
   * Gate the `done` transition (Phase 30 B2).
   *
   * Called by the Stop hook when the agent leaves a PR URL. Skips the gate
   * and falls straight through to `markDone` when:
   *  - `config.checks.enabled` is false (default), OR
   *  - the task has no repo (no cwd to run checks in), OR
   *  - the resolved check set is empty (no gates configured for that repo).
   *
   * Otherwise runs the checks, persists the run, then:
   *  - **pass** → `markDone(prUrl)` + `complete()` (today's behavior, now earned)
   *  - **fail** → `markWaiting()` + `complete()` (slot freed, task awaits human/auto-fix)
   *
   * The slot is released exactly once in every branch via `complete()`.
   */
  async completeWithChecks(taskId: string, prUrl: string): Promise<void> {
    const task = this.tasks.getTask(taskId);
    const cfg = this.config.checks;

    const resolved = cfg.enabled ? resolveChecksForRepo(cfg, task.repo ?? null) : [];
    const repo = task.repo ? this.repos.findByName(task.repo) : undefined;

    if (!cfg.enabled || resolved.length === 0 || !repo || !this.checks) {
      this.tasks.markDone(taskId, prUrl);
      this.complete(taskId);
      return;
    }

    // Expand `~` in the repo path so execFile can locate it.
    const cwd = repo.path.startsWith('~/')
      ? join(homedir(), repo.path.slice(2))
      : repo.path;

    this.tasks.recordCheckEvent(taskId, 'checks.started');
    const run = await this.checks.run(taskId, resolved, cwd, 'gate');
    this.tasks.saveCheckRun(run);
    this.tasks.recordCheckEvent(taskId, run.passed ? 'checks.passed' : 'checks.failed');

    if (run.passed) {
      this.tasks.markDone(taskId, prUrl);
      this.complete(taskId);
      return;
    }

    // Gate failed — try auto-fix if enabled and the budget hasn't been exhausted.
    const autoFix = this.config.checks.autoFix;
    const taskAfterGate = this.tasks.getTask(taskId);
    if (autoFix.enabled && taskAfterGate.fixAttempts < autoFix.maxAttempts) {
      this.tasks.incrementFixAttempts(taskId);
      this.tasks.recordCheckEvent(taskId, 'checks.fix.started');
      this.logger.log(
        `auto-fix attempt ${taskAfterGate.fixAttempts + 1}/${autoFix.maxAttempts} for task ${taskId}`,
      );

      const fixPrompt = buildFixPrompt(prUrl, run.results);

      // Kill the previous session (the agent has already stopped — Stop hook fired)
      // then spawn fresh with the fix prompt in the same cwd.
      this.clearRunTimeout(taskId);
      this.terminal.killManagedRun(taskId);

      const result = this.terminal.spawnAgentSession(
        taskId,
        { prompt: fixPrompt },
        { onExit: (code) => this.onExit(taskId, code) },
      );

      if (!result.ok) {
        this.logger.warn(`auto-fix spawn failed for ${taskId}: ${result.error}`);
        this.tasks.markWaiting(taskId);
        this.complete(taskId);
        return;
      }

      this.pool.setPid(taskId, result.pid);
      this.armTimeout(taskId);
      // Do NOT call complete() — the slot stays held until the fix agent's Stop
      // hook re-enters completeWithChecks (or onExit handles an unexpected exit).
      return;
    }

    // Auto-fix disabled or budget exhausted.
    if (autoFix.enabled && taskAfterGate.fixAttempts >= autoFix.maxAttempts) {
      this.tasks.recordCheckEvent(taskId, 'checks.fix.exhausted');
      this.logger.warn(
        `auto-fix budget exhausted (${taskAfterGate.fixAttempts}/${autoFix.maxAttempts}) for task ${taskId}`,
      );
    }
    this.tasks.markWaiting(taskId);
    this.complete(taskId);
  }

  /**
   * User-initiated stop (drag a running task back to todo/backlog, or the Stop
   * button): interrupt the agent with Ctrl+C and return the task to the queue —
   * NOT abandoned, unlike {@link cancel}. The status is set to `target` first so
   * the PTY's onExit sees a non-running task and won't retry/abandon it; the exit
   * then frees the slot. Clearing the session makes it read as idle.
   */
  stop(taskId: string, target: 'todo' | 'backlog' = 'todo'): void {
    this.clearRunTimeout(taskId);
    this.pool.abort(taskId);
    try {
      this.tasks.requeue(taskId, target);
    } catch (err) {
      this.logger.warn(
        `stop: failed to requeue ${taskId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
    this.terminal.interruptManagedRun(taskId);
  }

  /** User- or timeout-initiated stop: abandon the task and kill its session. The
   *  PTY's onExit then frees the slot. */
  cancel(taskId: string): void {
    this.endMetricRun(taskId, 'cancelled');
    this.clearRunTimeout(taskId);
    this.pool.abort(taskId);
    try {
      // → abandoned so the scheduler won't immediately re-pick it (unlike a crash,
      // which requeues). Abandoning archives the task per existing semantics.
      this.tasks.updateStatus(taskId, 'abandoned');
    } catch (err) {
      this.logger.warn(
        `cancel: failed to abandon ${taskId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
    this.terminal.killManagedRun(taskId);
  }

  // The PTY exited. If the task is still wip/waiting the agent died without the
  // Stop hook completing it (crash / external kill). Retry it up to maxRetries,
  // then abandon. A task already moved to done/abandoned is left as-is. Always
  // frees the slot.
  private onExit(taskId: string, exitCode: number): void {
    this.clearRunTimeout(taskId);
    let task: Task | undefined;
    try {
      task = this.tasks.getTask(taskId);
    } catch {
      task = undefined;
    }
    if (task && (task.status === 'wip' || task.status === 'waiting')) {
      const max = this.config.agent.maxRetries;
      const retries = task.retryCount ?? 0;
      if (retries >= max) {
        this.logger.warn(
          `agent session ${taskId} exited (code ${exitCode}) while ${task.status} — exhausted ${retries}/${max} retries, abandoning`,
        );
        this.endMetricRun(taskId, 'abandoned');
        try {
          this.tasks.updateStatus(taskId, 'abandoned');
        } catch (err) {
          this.logger.warn(
            `failed to abandon ${taskId}: ${err instanceof Error ? err.message : 'unknown'}`,
          );
        }
      } else {
        this.logger.warn(
          `agent session ${taskId} exited (code ${exitCode}) while ${task.status} — retry ${retries + 1}/${max}`,
        );
        this.endMetricRun(taskId, 'failed');
        this.safeRetry(taskId);
      }
    }
    this.pool.release(taskId);
  }

  private armTimeout(taskId: string): void {
    const ms = this.config.agent.runTimeoutMs;
    const timer = setTimeout(() => {
      this.logger.warn(`agent run ${taskId} exceeded ${ms}ms — cancelling`);
      this.cancel(taskId);
    }, ms);
    timer.unref?.();
    this.timers.set(taskId, timer);
  }

  private clearRunTimeout(taskId: string): void {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }
  }

  private safeRequeue(taskId: string): void {
    try {
      this.tasks.requeue(taskId);
    } catch (err) {
      this.logger.warn(
        `failed to requeue ${taskId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  private safeRetry(taskId: string): void {
    try {
      this.tasks.retry(taskId);
    } catch (err) {
      this.logger.warn(
        `failed to retry ${taskId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
