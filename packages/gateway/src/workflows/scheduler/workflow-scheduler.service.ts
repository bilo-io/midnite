import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Cron } from 'croner';
import { type MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../../config.token';
import { WorkflowsRepository } from '../workflows.repository';
import { WorkflowEngine } from '../engine/workflow-engine.service';

// A single gateway-owned tick loop (never parallel schedulers). Each tick evaluates every
// enabled schedule-triggered workflow and enqueues a run if a cron slot has elapsed. The
// tick only enqueues (engine.startRun is non-blocking), so a slow run never stalls the loop.
@Injectable()
export class WorkflowScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowScheduler.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(WorkflowsRepository) private readonly repo: WorkflowsRepository,
    @Inject(WorkflowEngine) private readonly engine: WorkflowEngine,
  ) {}

  onModuleInit(): void {
    if (!this.config.workflows.enabled) {
      this.logger.log('workflows disabled — scheduler not started');
      return;
    }
    const tickMs = this.config.workflows.schedulerTickMs;
    this.timer = setInterval(() => this.tick(), tickMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
    this.logger.log(`scheduler started (tick=${tickMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  tick(): void {
    const now = new Date();
    const tickMs = this.config.workflows.schedulerTickMs;
    for (const row of this.repo.listScheduledEnabledRows()) {
      try {
        const workflow = this.repo.hydrateWorkflow(row);
        if (workflow.trigger.type !== 'schedule') continue;
        const cron = new Cron(workflow.trigger.cron, {
          timezone: workflow.trigger.timezone || this.config.workflows.defaultTimezone,
        });
        // Look for a fire slot since the last fire (or one tick ago on first evaluation).
        const since = row.lastFiredAt
          ? new Date(row.lastFiredAt)
          : new Date(now.getTime() - tickMs);
        const next = cron.nextRun(since);
        if (next && next.getTime() <= now.getTime()) {
          this.engine.startRun(workflow, { triggerSource: 'schedule' });
          this.repo.setLastFiredAt(row.id, next.toISOString());
          this.logger.debug(`fired scheduled workflow ${workflow.id} (slot ${next.toISOString()})`);
        }
      } catch (err) {
        this.logger.warn(
          `skipping scheduled workflow ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
