import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import type { TaskBoardEvent } from '@midnite/shared';

import { TaskEventBus } from '../tasks/task-event-bus';
import { RetroBuilderService } from './retro-builder.service';

/**
 * Phase 62 A — auto-build a retro on a task's terminal transition. Subscribes to
 * the existing `TaskEventBus` (the search-module pattern — `tasks.service` is
 * untouched): on a `task.updated` whose task is `done`/`abandoned` and has no
 * retro for that outcome yet, build + store the skeleton. Fail-open — a retro
 * failure never propagates back into the task write path.
 */
@Injectable()
export class RetroSubscriberService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RetroSubscriberService.name);
  private unsubscribe?: () => void;

  constructor(
    @Inject(TaskEventBus) private readonly taskBus: TaskEventBus,
    @Inject(RetroBuilderService) private readonly builder: RetroBuilderService,
  ) {}

  onApplicationBootstrap(): void {
    this.unsubscribe = this.taskBus.subscribe((event) => this.onTaskEvent(event));
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  private onTaskEvent(event: TaskBoardEvent): void {
    if (event.type !== 'task.updated') return;
    const task = event.task;
    if (task.status !== 'done' && task.status !== 'abandoned') return;

    // Idempotent: skip when a retro for this outcome already exists (a done task
    // still emits `task.updated` on PR-status polls etc — don't rebuild each time).
    // A genuine re-terminal (outcome changed) rebuilds.
    const existing = this.builder.getByTaskId(task.id);
    if (existing && existing.outcome === task.status) return;

    try {
      this.builder.buildAndStore(task);
    } catch (err) {
      this.logger.warn(
        `retro build for task ${task.id} failed (${err instanceof Error ? err.message : 'unknown'}) — ignored`,
      );
    }
  }
}
