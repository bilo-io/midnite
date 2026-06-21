import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MidniteConfig, Task } from '@midnite/shared';
import { UrlContextService } from '../agent/url-context.service';
import { MIDNITE_CONFIG } from '../config.token';
import { TasksService } from '../tasks/tasks.service';
import { TerminalService } from '../terminal/terminal.service';
import { AgentPoolService } from './agent-pool.service';

/**
 * Drives a single task through an autonomous agent run: claim a slot, move the
 * task to `wip`, spawn the seeded agent session, and arm a timeout. The session
 * is reaped (and the slot freed) either by the Stop hook marking the task done
 * (Phase B) or by the PTY exiting — see {@link onExit}.
 */
@Injectable()
export class AgentRunnerService {
  private readonly logger = new Logger(AgentRunnerService.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(AgentPoolService) private readonly pool: AgentPoolService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(TerminalService) private readonly terminal: TerminalService,
    @Inject(UrlContextService) private readonly urlContext: UrlContextService,
  ) {}

  /** Claim a slot and spawn an agent session for `task`. Returns false (leaving
   *  the task in `todo`) if no slot was free or the spawn failed. */
  async start(task: Task): Promise<boolean> {
    if (this.pool.acquire(task.id) === null) return false;
    try {
      // Fold any linked GitHub issue/PR + URL context into the seed prompt
      // (best-effort, fail-open — never blocks the run). Phase 15 Theme B.
      const prompt = await this.urlContext.enrich(task.prompt?.trim() || task.title);
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
    this.clearRunTimeout(taskId);
    this.pool.release(taskId);
    this.terminal.killManagedRun(taskId);
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
