import { Injectable } from '@nestjs/common';
import type { TaskHeldReason } from '@midnite/shared';

/**
 * Phase 50 Theme B — the scheduler's in-memory record of which ready `todo`
 * tasks it is *holding* (not spawning) because a hard budget/rate cap is
 * blocking, and why. Purely transient state: it is never persisted (a held task
 * stays `todo`, re-evaluated every tick) and resets on restart, mirroring the
 * derived-not-stored discipline of "blocked" (Phase 27) and the pause state's
 * scheduling-only reach.
 *
 * It lives in the tasks module (a zero-dependency leaf provider) rather than the
 * pool module so `TasksService` can read it when hydrating a task's derived
 * `heldReason` without a `tasks → pool` import cycle — the pool's scheduler
 * (which imports `TasksModule`) is the sole writer.
 */
@Injectable()
export class HeldTasksRegistry {
  private held = new Map<string, TaskHeldReason>();

  /** The reason task `id` is currently held, or undefined when spawnable. */
  get(id: string): TaskHeldReason | undefined {
    return this.held.get(id);
  }

  /** Replace the whole held set (the scheduler recomputes it each tick). */
  replace(next: Map<string, TaskHeldReason>): void {
    this.held = new Map(next);
  }

  /** Snapshot for tests / diagnostics. */
  snapshot(): ReadonlyMap<string, TaskHeldReason> {
    return this.held;
  }
}
