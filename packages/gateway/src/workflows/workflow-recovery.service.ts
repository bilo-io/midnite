import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { WorkflowsRepository } from './workflows.repository';
import { WorkflowEventBus } from './workflow-event-bus';

/** Error recorded on a run/node reconciled as a restart orphan (matches councils). */
const STALE_ERROR = 'gateway restarted mid-run';

/**
 * Boot recovery for workflow runs (Phase 7 A4). Runs execute as in-process JS —
 * no PTY, no external process — so a run still marked `running` after a restart
 * is orphaned with nothing to resume. On boot we fail it (and its in-flight
 * node-runs) and emit `run.failed`, the same way tasks requeue orphaned `wip`
 * and councils fail stale runs. Idempotent: a clean boot finds nothing.
 */
@Injectable()
export class WorkflowRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowRecoveryService.name);

  constructor(
    @Inject(WorkflowsRepository) private readonly repo: WorkflowsRepository,
    @Inject(WorkflowEventBus) private readonly bus: WorkflowEventBus,
  ) {}

  onModuleInit(): void {
    const stale = this.repo.listRunningRunRows();
    if (stale.length === 0) return;
    const at = new Date().toISOString();
    for (const run of stale) {
      this.repo.finishRun(run.id, { status: 'failed', error: STALE_ERROR, finishedAt: at });
      this.repo.failRunningNodeRuns(run.id, STALE_ERROR, at);
      this.bus.emit({
        type: 'run.failed',
        workflowId: run.workflowId,
        runId: run.id,
        at,
        error: STALE_ERROR,
      });
    }
    this.logger.warn(`marked ${stale.length} stale workflow run(s) as failed (gateway restart)`);
  }
}
