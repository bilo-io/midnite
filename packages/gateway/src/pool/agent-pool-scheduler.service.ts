import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { MidniteConfig, PauseScope, Task, TaskHeldReason } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { HealthService } from '../health/health.service';
import { MetricsService } from '../metrics/metrics.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { HeldTasksRegistry } from '../tasks/held-tasks.registry';
import { TaskEventBus } from '../tasks/task-event-bus';
import { TasksService } from '../tasks/tasks.service';
import { UsageService } from '../usage/usage.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';
import { PoolWatchdogService } from './pool-watchdog.service';

/** Rolling window over which {@link AgentPoolScheduler} counts spawns for the
 *  per-hour rate cap. In-memory (resets on restart) — a throttle, not a ledger. */
const SPAWN_RATE_WINDOW_MS = 3_600_000;

/** Fixed order for the held cap-types, so the notification edge-check is stable. */
const HELD_REASONS: readonly TaskHeldReason[] = ['over-budget', 'rate-limited'];

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
  /** Phase 54 D — lifecycle pause (graceful shutdown / reusable by the kill
   *  switch). Distinct from teardown (which clears the timer) and from Phase 50's
   *  business `isGloballyPaused`: the timer keeps firing so resume() is instant. */
  private paused = false;
  /** Consecutive ticks the readiness gate has failed (DB down) — drives backoff. */
  private unreadyStreak = 0;
  /** Epoch ms before which the tick skips entirely while backing off. */
  private backoffUntil = 0;
  /** Timestamps (ms) of recent spawns for the rolling per-hour rate cap. */
  private spawnTimes: number[] = [];
  /** The held set as of the previous tick — for change detection (WS + notify edges). */
  private prevHeld = new Map<string, TaskHeldReason>();
  /** Cap-types currently blocking — a notification fires only on the not-blocking→blocking edge. */
  private activeHeldCaps = new Set<TaskHeldReason>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(AgentPoolService) private readonly pool: AgentPoolService,
    @Inject(AgentRunnerService) private readonly runner: AgentRunnerService,
    @Optional() @Inject(MetricsService) private readonly metrics?: MetricsService,
    @Optional() @Inject(ApprovalsService) private readonly approvals?: ApprovalsService,
    @Optional() @Inject(TaskEventBus) private readonly bus?: TaskEventBus,
    // Phase 50 Theme B — hard spend/rate caps. All optional so existing scheduler
    // specs (which construct this by hand) keep compiling; the feature is inert
    // when a dep is absent or its cap is unset (defaults = pre-Phase-50 behavior).
    @Optional() @Inject(UsageService) private readonly usage?: UsageService,
    @Optional() @Inject(HeldTasksRegistry) private readonly held?: HeldTasksRegistry,
    @Optional() @Inject(NotificationsService) private readonly notifications?: NotificationsService,
    // Last + optional so existing positional-construction specs are unaffected;
    // Nest provides it in production (PoolModule). Phase 54 C.
    @Optional() @Inject(PoolWatchdogService) private readonly watchdog?: PoolWatchdogService,
    // Phase 54 D — the readiness gate's DB probe. forwardRef because HealthService
    // injects this scheduler (readiness reads the scheduler's state); @Optional so
    // it degrades to no-gate (behaviour-preserving) when absent (unit specs).
    @Optional()
    @Inject(forwardRef(() => HealthService))
    private readonly health?: HealthService,
  ) {}

  onModuleInit(): void {
    // React to an emergency stop regardless of poolEnabled (a disabled pool has
    // nothing to abort, so it's a harmless no-op then). The pool owns the abort so
    // ApprovalsService (which emits the event) needn't depend on the pool.
    this.bus?.subscribe((event) => {
      if (event.type === 'guardrails.updated' && event.emergencyStop) {
        this.abortInFlight(event.scope);
      }
    });

    if (!this.config.agent.poolEnabled) {
      this.logger.log('agent pool disabled — scheduler not started');
      return;
    }
    const tickMs = this.config.agent.schedulerTickMs;
    this.timer = setInterval(() => void this.tick(), tickMs);
    this.timer.unref?.();
    this.logger.log(`agent pool scheduler started (tick=${tickMs}ms, pool=${this.pool.capacity()})`);
  }

  /** Abort every in-flight agent whose task falls in the emergency-stopped scope,
   *  returning each to `todo` (not abandoned) so it re-runs once resumed. */
  private abortInFlight(scope: PauseScope | undefined): void {
    const target: PauseScope = scope ?? { kind: 'global' };
    let aborted = 0;
    for (const taskId of this.pool.busyTaskIds()) {
      let inScope = target.kind === 'global';
      if (!inScope && target.kind !== 'global') {
        const task = this.safeGetTask(taskId);
        inScope =
          target.kind === 'repo' ? task?.repo === target.id : task?.teamId === target.id;
      }
      if (!inScope) continue;
      this.runner.stop(taskId, 'todo');
      aborted++;
    }
    if (aborted > 0) this.logger.warn(`emergency stop (${target.kind}): aborted ${aborted} in-flight agent(s)`);
  }

  private safeGetTask(taskId: string): { repo?: string | null; teamId?: string | null } | undefined {
    try {
      return this.tasks.getTask(taskId);
    } catch {
      return undefined;
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Whether the tick loop is currently scheduled. Used by the readiness check
   *  (Phase 54 B): when the pool is enabled the scheduler should be running. */
  isRunning(): boolean {
    return this.timer !== undefined;
  }

  /**
   * Phase 54 D — stop accepting new work without tearing down the loop. The
   * interval keeps firing (so {@link resume} is instant and {@link isRunning}
   * stays true), but {@link tick} short-circuits before scheduling. The shared
   * mechanism graceful shutdown (Theme E) uses to drain; distinct from Phase 50's
   * business `isGloballyPaused` (both independently gate the tick). Idempotent.
   */
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.logger.log('scheduler paused — not accepting new work');
  }

  /** Resume scheduling after a {@link pause}. Idempotent. */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.logger.log('scheduler resumed');
  }

  /** Whether the scheduler is lifecycle-paused (Phase 54 D). */
  isPaused(): boolean {
    return this.paused;
  }

  /** Whether the scheduler is currently backing off an unready dependency
   *  (DB down) — reflected in `/health/ready` (Phase 54 D). */
  isBackingOff(): boolean {
    return this.backoffUntil > Date.now();
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
    // Tasks the scheduler is holding this tick because a hard cap blocks them
    // (Phase 50 B). Reconciled at the end so a cleared hold broadcasts too.
    const held = new Map<string, TaskHeldReason>();
    try {
      // Phase 54 D: while backing off an unready dependency, skip the whole tick
      // (no DB probe, no watchdog, no log) until the backoff window elapses.
      if (tickStart < this.backoffUntil) return;
      // Readiness gate: don't tick into a dead database — skip + back off
      // exponentially instead of hammering. Fail-open: when HealthService isn't
      // wired (unit specs) the gate is a no-op (pre-Phase-54-D behaviour).
      if (this.health && !this.health.dbReachable()) {
        this.enterReadinessBackoff();
        return;
      }
      this.clearReadinessBackoff();
      // Phase 54 C: reconcile leaked slots first, so a wedged (fully-busy but
      // orphaned) pool is healed even when nothing new can be scheduled — and
      // even under a pause. Fail-open: never let it abort the tick.
      try {
        this.watchdog?.sweep();
      } catch (err) {
        this.logger.warn(
          `watchdog sweep failed: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
      // Phase 54 D: lifecycle pause (graceful shutdown / kill switch) — heal via
      // the watchdog above, but accept no new work while paused.
      if (this.paused) return;
      // Phase 50 A: a global pause halts all scheduling; scoped pauses filter the
      // ready-set below. Fail-safe — paused ⇒ spawn nothing. (A paused system
      // isn't "held by a cap" — leave the held set empty so it reconciles clear.)
      if (this.approvals?.isGloballyPaused()) return;
      // Record queue depth before assigning — "how many tasks were waiting".
      this.metrics?.recordQueueDepth(this.tasks.listReadyTodoTasks().length);

      // Phase 50 B: a hard spend cap blocks ALL spawns this tick — every
      // schedulable ready task is held "over-budget" (evaluated globally).
      const overBudget = Boolean(this.usage?.checkBudget().over);
      if (overBudget) {
        for (const t of this.schedulableReady()) held.set(t.id, 'over-budget');
        return;
      }

      while (this.pool.freeSlotCount() > 0) {
        const running = this.runningCountsByRepo();
        const eligible = this.tasks
          .listReadyTodoTasks()
          .filter(
            (t) =>
              !this.pool.slotForTask(t.id) &&
              !this.approvals?.isTaskPaused(t) &&
              this.repoHasCapacity(t.repo, running) &&
              this.userHasCapacity(t.createdBy ?? undefined) &&
              !held.has(t.id),
          );
        const next = eligible[0];
        if (!next) break;
        // Phase 50 B: per-hour spawn cap — hold the remaining eligible tasks and
        // stop once the rolling window is full (recovers as the window rolls).
        if (this.spawnRateFull()) {
          for (const t of eligible) held.set(t.id, 'rate-limited');
          break;
        }
        const started = await this.runner.start(next);
        if (!started) break;
        this.recordSpawn();
      }
    } finally {
      this.reconcileHeld(held);
      this.metrics?.recordTickLatency(Date.now() - tickStart);
      this.running = false;
    }
  }

  /** Ready `todo` tasks the scheduler would consider spawning (unassigned + not
   *  scope-paused). Used to mark the whole set held when a global cap blocks. */
  private schedulableReady(): Task[] {
    return this.tasks
      .listReadyTodoTasks()
      .filter((t) => !this.pool.slotForTask(t.id) && !this.approvals?.isTaskPaused(t));
  }

  /** Record a spawn against the rolling per-hour window (Phase 50 B). */
  private recordSpawn(): void {
    this.spawnTimes.push(Date.now());
  }

  /** Whether the per-hour spawn window is full. `maxSpawnsPerHour <= 0` = unlimited.
   *  Prunes aged-out entries as a side effect so the window stays bounded. */
  private spawnRateFull(): boolean {
    const cap = this.config.agent.maxSpawnsPerHour;
    if (cap <= 0) return false;
    const cutoff = Date.now() - SPAWN_RATE_WINDOW_MS;
    this.spawnTimes = this.spawnTimes.filter((t) => t > cutoff);
    return this.spawnTimes.length >= cap;
  }

  /** Publish the tick's held set (Phase 50 B): update the registry, broadcast
   *  `task.updated` for every task whose held state changed (so the board's chip
   *  refreshes), and fire one edge-triggered notification per newly-blocking cap.
   *  Never throws — a surfacing failure must not wedge the tick. */
  private reconcileHeld(held: Map<string, TaskHeldReason>): void {
    this.held?.replace(held);
    // Broadcast the tasks whose held reason was added, removed, or changed.
    const changed = new Set<string>([...held.keys(), ...this.prevHeld.keys()]);
    for (const id of changed) {
      if (held.get(id) === this.prevHeld.get(id)) continue;
      try {
        this.bus?.emit({ type: 'task.updated', at: new Date().toISOString(), task: this.tasks.getTask(id) });
      } catch {
        // Task vanished (deleted) between the tick and the broadcast — ignore.
      }
    }
    // One notification per cap-type on its not-blocking→blocking transition.
    const capsNow = new Set(held.values());
    for (const cap of HELD_REASONS) {
      if (capsNow.has(cap) && !this.activeHeldCaps.has(cap)) {
        const count = [...held.values()].filter((r) => r === cap).length;
        void this.notifications?.notifyGuardrailHeld(cap, count);
      }
    }
    this.activeHeldCaps = capsNow;
    this.prevHeld = held;
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

  /** Phase 54 D — the readiness gate failed (DB down): grow the exponential
   *  backoff window and set `backoffUntil`. Logs once per re-probe (the
   *  `backoffUntil` skip suppresses intermediate ticks), so no log-spam. */
  private enterReadinessBackoff(): void {
    this.unreadyStreak += 1;
    const { baseMs, maxMs } = this.config.agent.readinessBackoff;
    const waitMs = Math.min(baseMs * 2 ** (this.unreadyStreak - 1), maxMs);
    this.backoffUntil = Date.now() + waitMs;
    this.logger.warn(
      `scheduler readiness gate: database unreachable — backing off ${waitMs}ms (attempt ${this.unreadyStreak})`,
    );
  }

  /** Readiness recovered (or was never lost): clear the backoff. Logs once on
   *  the down→up edge. */
  private clearReadinessBackoff(): void {
    if (this.unreadyStreak > 0) {
      this.logger.log(`scheduler readiness recovered after ${this.unreadyStreak} attempt(s) — resuming`);
    }
    this.unreadyStreak = 0;
    this.backoffUntil = 0;
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
