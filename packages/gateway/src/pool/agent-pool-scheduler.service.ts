import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { MetricsService } from '../metrics/metrics.service';
import { TasksService } from '../tasks/tasks.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';

/**
 * A single gateway-owned tick loop (never parallel) that assigns ready `todo`
 * tasks to free agent slots. Structurally mirrors the workflow and heartbeat
 * schedulers: OnModuleInit/Destroy, setInterval + unref, a `running` reentrancy
 * guard, and a public `tick()` for tests. Feature-flagged off by default.
 */
@Injectable()
export class AgentPoolScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentPoolScheduler.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(AgentPoolService) private readonly pool: AgentPoolService,
    @Inject(AgentRunnerService) private readonly runner: AgentRunnerService,
    @Optional() @Inject(MetricsService) private readonly metrics?: MetricsService,
  ) {}

  onModuleInit(): void {
    if (!this.config.agent.poolEnabled) {
      this.logger.log('agent pool disabled — scheduler not started');
      return;
    }
    const tickMs = this.config.agent.schedulerTickMs;
    this.timer = setInterval(() => void this.tick(), tickMs);
    this.timer.unref?.();
    this.logger.log(`agent pool scheduler started (tick=${tickMs}ms, pool=${this.pool.capacity()})`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Whether the tick loop is currently scheduled. Used by the readiness check
   *  (Phase 54 B): when the pool is enabled the scheduler should be running. */
  isRunning(): boolean {
    return this.timer !== undefined;
  }

  // Fill every free slot with the oldest unassigned *ready* `todo` task, skipping
  // any whose repo is already at the per-repo concurrency cap. "Ready" = every
  // dependency blocker is `done` (Phase 27 Theme B) — a blocked task (incl. one
  // held by an `abandoned` blocker, which is never `done`) is excluded from the
  // ready set, so priority+age ordering among ready tasks can't promote it past
  // its blocker. Public so tests can drive it directly. Never throws
  // (runner.start swallows its own errors).
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const tickStart = Date.now();
    try {
      // Record queue depth before assigning — "how many tasks were waiting".
      this.metrics?.recordQueueDepth(this.tasks.listReadyTodoTasks().length);
      while (this.pool.freeSlotCount() > 0) {
        const running = this.runningCountsByRepo();
        const next = this.tasks
          .listReadyTodoTasks()
          .find(
            (t) =>
              !this.pool.slotForTask(t.id) &&
              this.repoHasCapacity(t.repo, running) &&
              this.userHasCapacity(t.createdBy ?? undefined),
          );
        if (!next) break;
        const started = await this.runner.start(next);
        if (!started) break;
      }
    } finally {
      this.metrics?.recordTickLatency(Date.now() - tickStart);
      this.running = false;
    }
  }

  /** Whether another agent may start on `repo` without exceeding the cap. A
   *  repo-less task is never capped; `maxPerRepo <= 0` means unlimited. */
  private repoHasCapacity(repo: string | undefined, running: Map<string, number>): boolean {
    const cap = this.config.agent.maxPerRepo;
    if (!repo || cap <= 0) return true;
    return (running.get(repo) ?? 0) < cap;
  }

  /** Whether a user has capacity for another concurrent agent slot. Tasks without
   *  a createdBy (legacy static-token path) are never capped. `perUserMaxSlots <= 0`
   *  means unlimited. */
  private userHasCapacity(userId: string | undefined): boolean {
    const cap = this.config.agent.perUserMaxSlots;
    if (!userId || cap <= 0) return true;
    return this.pool.busyCountForUser(userId) < cap;
  }

  /** Count of busy slots per repo right now (repo-less running tasks omitted). */
  private runningCountsByRepo(): Map<string, number> {
    const repoById = new Map(this.tasks.listTasks().map((t) => [t.id, t.repo]));
    const counts = new Map<string, number>();
    for (const id of this.pool.busyTaskIds()) {
      const repo = repoById.get(id);
      if (repo) counts.set(repo, (counts.get(repo) ?? 0) + 1);
    }
    return counts;
  }
}
