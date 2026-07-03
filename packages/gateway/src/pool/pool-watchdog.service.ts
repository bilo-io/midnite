import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MidniteConfig, Task } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { TasksService } from '../tasks/tasks.service';
import { TerminalService } from '../terminal/terminal.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';
import { classifyFailure } from './lib/classify-failure';

/**
 * Live pool watchdog (Phase 54 Theme C). A **fail-open pass on the scheduler
 * tick** (never a second scheduler) that reconciles the in-memory slot table
 * against reality each cycle, so a leaked slot can't silently wedge the pool
 * until a restart:
 *
 *  - **orphaned slot** — busy, but its task is gone / already terminal → reclaim.
 *  - **lost/dead session** — busy `wip`/`waiting` task whose session has no live
 *    process (so the runner's `onExit` will never fire) → reconcile as a crash.
 *  - **hung session** — a `pty` run silent past the no-output heartbeat
 *    (`agent.watchdog.inactivityMs`, opt-in) → reconcile as inactivity, catching
 *    it before the 30-min run timeout. tmux keeps its own `pane_dead` poll.
 *
 * Auto-healed reclaims are classified via the Phase 53 failure taxonomy and
 * requeue-or-escalate through the runner (which owns the retry/abandon decision).
 */
@Injectable()
export class PoolWatchdogService {
  private readonly logger = new Logger(PoolWatchdogService.name);

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(AgentPoolService) private readonly pool: AgentPoolService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(TerminalService) private readonly terminal: TerminalService,
    @Inject(AgentRunnerService) private readonly runner: AgentRunnerService,
  ) {}

  /**
   * Reconcile every busy slot against reality. Fail-open: a per-slot error is
   * logged and the sweep continues; the whole pass never throws into the tick.
   */
  sweep(): void {
    const wd = this.config.agent.watchdog;
    if (!wd.enabled) return;
    const durable = this.terminal.isDurable();

    let orphaned = 0;
    let dead = 0;
    let hung = 0;
    for (const taskId of this.pool.busyTaskIds()) {
      try {
        const task = this.safeGetTask(taskId);
        // Slot busy for a task that's gone or no longer running → leaked slot.
        if (!task || (task.status !== 'wip' && task.status !== 'waiting')) {
          this.runner.reclaimOrphanedSlot(taskId);
          orphaned++;
          continue;
        }
        const health = this.terminal.agentRunHealth(taskId);
        // No handle, or the backend says the process is gone: onExit can't fire.
        if (health === null || !health.live) {
          this.runner.reconcileUnhealthy(taskId, classifyFailure({ site: 'lost' }));
          dead++;
          continue;
        }
        // Hung: alive but silent past the heartbeat. Opt-in + pty only (tmux's
        // pane_dead poll already covers its sessions).
        if (wd.inactivityMs > 0 && !durable && health.idleMs >= wd.inactivityMs) {
          this.runner.reconcileUnhealthy(
            taskId,
            classifyFailure({ site: 'inactivity', idleMs: health.idleMs }),
          );
          hung++;
        }
      } catch (err) {
        // Fail-open: one bad slot never aborts the sweep or the tick.
        this.logger.warn(
          `watchdog: error reconciling slot ${taskId}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    const total = orphaned + dead + hung;
    if (total > 0) {
      this.logger.warn(
        `watchdog reclaimed ${total} slot(s): ${orphaned} orphaned, ${dead} dead, ${hung} hung`,
      );
    }
  }

  private safeGetTask(taskId: string): Task | undefined {
    try {
      return this.tasks.getTask(taskId);
    } catch {
      return undefined;
    }
  }
}
