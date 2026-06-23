import { Inject, Injectable, Optional } from '@nestjs/common';
import type { AgentPoolSnapshot, MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { MetricsService } from '../metrics/metrics.service';
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
 * persisted — tasks are the source of truth, so slots start idle on boot and are
 * re-acquired on the next tick. Reconciling tasks left `wip`/`waiting` by a
 * previous process (requeue, or reattach under the durable `tmux` backend) is
 * owned by {@link AgentRunnerService.onModuleInit} (Phase 17 §C2), which has the
 * session wiring reattach needs.
 */
@Injectable()
export class AgentPoolService {
  private readonly slots: PoolSlot[];

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Optional() @Inject(MetricsService) private readonly metrics?: MetricsService,
  ) {
    this.slots = Array.from({ length: this.config.agent.pool }, (_, i) => ({
      id: `slot-${i}`,
      status: 'idle',
    }));
  }

  private emitSlotGauge(): void {
    const used = this.slots.filter((s) => s.status === 'busy').length;
    this.metrics?.recordSlotChange(used, this.slots.length);
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

  /** Task ids currently occupying a busy slot — the live set of running agents,
   *  used by the scheduler to enforce per-repo concurrency caps. */
  busyTaskIds(): string[] {
    return this.slots.flatMap((s) => (s.status === 'busy' && s.taskId ? [s.taskId] : []));
  }

  /** Claim a free slot for a task. Returns its AbortSignal, or null if full.
   *  Idempotent: if the task already holds a slot, its existing signal is
   *  returned rather than claiming a second one — a per-task double-acquire
   *  would otherwise leak a slot forever, since {@link release} and
   *  {@link slotForTask} only ever address the first slot matching a task. */
  acquire(taskId: string): AbortSignal | null {
    const existing = this.slotForTask(taskId);
    if (existing) return existing.abort?.signal ?? null;
    const slot = this.slots.find((s) => s.status === 'idle');
    if (!slot) return null;
    slot.status = 'busy';
    slot.taskId = taskId;
    slot.abort = new AbortController();
    this.emitSlotGauge();
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
    this.emitSlotGauge();
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
