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

  // Fill every free slot with the oldest unassigned `todo` task. Public so tests
  // can drive it directly. Never throws (runner.start swallows its own errors).
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pool.freeSlotCount() > 0) {
        const next = this.tasks
          .listTasks('todo')
          .find((t) => !this.pool.slotForTask(t.id));
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
}
