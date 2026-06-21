import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
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

  // Fill every free slot with the oldest unassigned `todo` task, skipping any
  // whose repo is already at the per-repo concurrency cap. Public so tests can
  // drive it directly. Never throws (runner.start swallows its own errors).
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pool.freeSlotCount() > 0) {
        // Snapshot per iteration: a task started earlier in this loop now occupies
        // a slot, so its repo's count is reflected here. Constant within the find
        // below (nothing starts mid-scan), so compute it once, not per candidate.
        const running = this.runningCountsByRepo();
        const next = this.tasks
          .listTasks('todo')
          .find((t) => !this.pool.slotForTask(t.id) && this.repoHasCapacity(t.repo, running));
        // No eligible task — either the queue is empty or every remaining task is
        // blocked by its repo's cap; either way, nothing more to start this tick.
        if (!next) break;
        const started = await this.runner.start(next);
        // A failed start (e.g. terminal session cap reached) means further
        // attempts this tick will fail too — stop and retry next tick.
        if (!started) break;
      }
    } finally {
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
