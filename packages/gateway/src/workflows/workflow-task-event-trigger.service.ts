import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  type MidniteConfig,
  type Task,
  type TaskBoardEvent,
  type TaskEventTriggerEvent,
} from '@midnite/shared';

import { MIDNITE_CONFIG } from '../config.token';
import { type WorkflowRow } from '../db/schema';
import { TaskEventBus } from '../tasks/task-event-bus';
import { WorkflowsRepository } from './workflows.repository';
import { WorkflowEngine } from './engine/workflow-engine.service';
import {
  matchesTaskEventFilter,
  matchesTaskEventTeam,
  taskEventForStatus,
  taskEventInput,
} from './lib/task-event-match';

// Cap the idempotency set so a long-lived gateway can't grow it unbounded; a rare
// eviction only risks one duplicate run for a very old (workflow, task, event).
const DEDUPE_MAX = 5000;

/**
 * Phase 62 B — fire workflows when a task reaches a terminal / attention-worthy
 * state. Subscribes to the existing `TaskEventBus` (the search/retro-subscriber
 * pattern — `tasks.service` is untouched): on a matching `task.updated`, every
 * enabled `task-event` workflow whose events + filter + team-scope match enqueues
 * a run with a compact task summary as trigger input. Idempotent per
 * (workflow, task, event) so a `done` task re-emitting `task.updated` fires once.
 * Fail-open — a trigger failure never propagates back into the task write path.
 */
@Injectable()
export class WorkflowTaskEventTriggerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowTaskEventTriggerService.name);
  private unsubscribe?: () => void;
  private readonly fired = new Set<string>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TaskEventBus) private readonly taskBus: TaskEventBus,
    @Inject(WorkflowsRepository) private readonly repo: WorkflowsRepository,
    @Inject(WorkflowEngine) private readonly engine: WorkflowEngine,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.workflows.enabled) {
      this.logger.log('workflows disabled — task-event trigger not started');
      return;
    }
    this.unsubscribe = this.taskBus.subscribe((event) => this.onTaskEvent(event));
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  private onTaskEvent(event: TaskBoardEvent): void {
    if (event.type !== 'task.updated') return;
    const task = event.task;
    const matched = taskEventForStatus(task);
    if (!matched) return;

    for (const row of this.repo.listTaskEventEnabledRows()) {
      try {
        this.maybeFire(row, task, matched);
      } catch (err) {
        this.logger.warn(
          `task-event trigger for workflow ${row.id} failed (${err instanceof Error ? err.message : 'unknown'}) — ignored`,
        );
      }
    }
  }

  private maybeFire(row: WorkflowRow, task: Task, matched: TaskEventTriggerEvent): void {
    if (!matchesTaskEventTeam(task.teamId, row.teamId)) return;

    const workflow = this.repo.hydrateWorkflow(row);
    if (workflow.trigger.type !== 'task-event') return;
    if (!workflow.trigger.events.includes(matched)) return;
    if (!matchesTaskEventFilter(task, workflow.trigger)) return;

    // Idempotent: a `done`/`abandoned` task keeps re-emitting `task.updated`
    // (PR-status polls, dependents re-broadcast) — fire once per (workflow, task, event).
    const key = `${workflow.id}:${task.id}:${matched}`;
    if (this.fired.has(key)) return;
    this.remember(key);

    this.engine.startRun(workflow, { triggerSource: 'task-event', input: taskEventInput(task, matched) });
    this.logger.debug(`fired task-event workflow ${workflow.id} for task ${task.id} (${matched})`);
  }

  private remember(key: string): void {
    if (this.fired.size >= DEDUPE_MAX) {
      // Evict the oldest insertion (Set preserves insertion order).
      const oldest = this.fired.values().next().value;
      if (oldest !== undefined) this.fired.delete(oldest);
    }
    this.fired.add(key);
  }
}
