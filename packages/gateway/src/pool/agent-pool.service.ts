import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { AgentPoolSnapshot, MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { TasksService } from '../tasks/tasks.service';

interface PoolSlot {
  id: string;
  status: 'idle' | 'busy';
  taskId?: string;
  pid?: number;
  // Per-run cancellation handle, surfaced to the runner so a timeout/cancel can
  // abort cooperative work without reaching into the PTY.
  abort?: AbortController;
}

/**
 * Tracks the gateway's fixed set of agent slots in memory. Slots are NOT
 * persisted — tasks are the source of truth — so on boot we reconcile any task
 * left `wip`/`waiting` (its PTY died with the previous process) back to `todo`.
 */
@Injectable()
export class AgentPoolService implements OnModuleInit {
  private readonly logger = new Logger(AgentPoolService.name);
  private readonly slots: PoolSlot[];

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {
    this.slots = Array.from({ length: this.config.agent.pool }, (_, i) => ({
      id: `slot-${i}`,
      status: 'idle',
    }));
  }

  onModuleInit(): void {
    // PTYs don't survive a gateway restart, so any task still wip/waiting has an
    // orphaned (dead) session. Return them to the queue so the scheduler re-runs
    // them; slots start idle and are re-acquired on the next tick.
    const stale = this.tasks
      .listTasks()
      .filter((t) => t.status === 'wip' || t.status === 'waiting');
    for (const task of stale) {
      try {
        this.tasks.requeue(task.id);
      } catch (err) {
        this.logger.warn(
          `failed to reconcile orphaned task ${task.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }
    if (stale.length > 0) {
      this.logger.log(`reconciled ${stale.length} orphaned wip/waiting task(s) → todo`);
    }
  }

  capacity(): number {
    return this.slots.length;
  }

  freeSlotCount(): number {
    return this.slots.filter((s) => s.status === 'idle').length;
  }

  slotForTask(taskId: string): PoolSlot | undefined {
    return this.slots.find((s) => s.taskId === taskId);
  }

  /** Claim a free slot for a task. Returns its AbortSignal, or null if full. */
  acquire(taskId: string): AbortSignal | null {
    const slot = this.slots.find((s) => s.status === 'idle');
    if (!slot) return null;
    slot.status = 'busy';
    slot.taskId = taskId;
    slot.abort = new AbortController();
    return slot.abort.signal;
  }

  setPid(taskId: string, pid: number): void {
    const slot = this.slotForTask(taskId);
    if (slot) slot.pid = pid;
  }

  /** Trip the slot's AbortSignal without freeing it (cancel/timeout path). */
  abort(taskId: string): void {
    this.slotForTask(taskId)?.abort?.abort();
  }

  /** Free a slot back to idle. Safe to call for an unknown task. */
  release(taskId: string): void {
    const slot = this.slotForTask(taskId);
    if (!slot) return;
    slot.status = 'idle';
    slot.taskId = undefined;
    slot.pid = undefined;
    slot.abort = undefined;
  }

  snapshot(): AgentPoolSnapshot {
    const slots = this.slots.map((s) => ({
      id: s.id,
      status: s.status,
      ...(s.taskId ? { taskId: s.taskId } : {}),
      ...(s.pid !== undefined ? { pid: s.pid } : {}),
    }));
    return {
      slots,
      capacity: this.slots.length,
      busy: slots.filter((s) => s.status === 'busy').length,
      queuedTodo: this.tasks.listTasks('todo').length,
    };
  }
}
