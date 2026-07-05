import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { isNeedsAttention, type MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { NotificationsService } from '../notifications/notifications.service';
import { TasksService } from '../tasks/tasks.service';

/** Per-task nudge bookkeeping (in-memory — a reminder cadence, not a durable
 *  ledger; it resets on restart, which at worst re-sends one reminder). */
type NudgeState = { count: number; lastNudgedAt: number };

/**
 * Phase 53 Theme D — the waiting-nudge loop. A task escalated to a
 * needs-attention `waiting` state (a failure `waitReason`, not a live
 * `needs-input` block) that sits untouched fires **escalating reminders** via
 * Phase 21 notifications, so "needs a human" doesn't rot silently.
 *
 * It is **not** a scheduler — it makes no scheduling decisions and never touches
 * a slot; it only reads waiting tasks and emits notifications (like the PR
 * poller). Fail-open: a tick error logs `warn` and never throws. Disabled when
 * `agent.waitingNudge.afterHours` is 0 (the default), so it's behaviour-preserving.
 *
 * Waiting-duration is measured from the task's `updatedAt`: nothing writes to a
 * task while it sits in `waiting` (the nudge itself only notifies), so that stamp
 * is the moment it entered the state.
 */
@Injectable()
export class WaitingNudgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WaitingNudgeService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;
  /** taskId → nudge state. Pruned each tick as tasks leave the waiting set. */
  private readonly state = new Map<string, NudgeState>();
  /** taskId → aged-todo nudge state (Phase 53 C). Pruned as todos start/leave. */
  private readonly todoState = new Map<string, NudgeState>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Optional() @Inject(NotificationsService) private readonly notifications?: NotificationsService,
  ) {}

  onModuleInit(): void {
    const cfg = this.config.agent.waitingNudge;
    // The loop earns its keep if EITHER signal is enabled (Phase 53 D waiting
    // nudges OR the Phase 53 C aged-todo flag).
    if (cfg.afterHours <= 0 && cfg.agedTodoHours <= 0) {
      this.logger.log('waiting/aged-todo nudges disabled (afterHours = 0, agedTodoHours = 0)');
      return;
    }
    this.timer = setInterval(() => void this.tick(), cfg.tickMs);
    this.timer.unref?.();
    this.logger.log(
      `nudge loop started (afterHours=${cfg.afterHours}, agedTodoHours=${cfg.agedTodoHours}, repeatHours=${cfg.repeatHours}, max=${cfg.maxReminders})`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Evaluate every needs-attention waiting task against the nudge thresholds and
   *  fire due reminders. Public so tests can drive it with an injected `now`.
   *  Fail-open — a dispatch or read error is logged, never thrown. */
  async tick(now: number = Date.now()): Promise<void> {
    const cfg = this.config.agent.waitingNudge;
    if (cfg.afterHours <= 0 && cfg.agedTodoHours <= 0) return; // both disabled (default)
    if (this.running) return;
    this.running = true;
    try {
      const repeatMs = cfg.repeatHours * 3_600_000;

      if (cfg.afterHours > 0) await this.nudgeWaiting(cfg.afterHours * 3_600_000, repeatMs, cfg.maxReminders, now);
      if (cfg.agedTodoHours > 0)
        await this.flagAgedTodos(cfg.agedTodoHours * 3_600_000, repeatMs, cfg.maxReminders, now);
    } catch (err) {
      this.logger.warn(`nudge tick failed: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      this.running = false;
    }
  }

  /** Phase 53 D — escalating reminders for needs-attention `waiting` tasks. */
  private async nudgeWaiting(afterMs: number, repeatMs: number, max: number, now: number): Promise<void> {
    const waiting = this.tasks.listTasks('waiting').filter((t) => isNeedsAttention(t.waitReason));
    const live = new Set(waiting.map((t) => t.id));
    for (const id of [...this.state.keys()]) if (!live.has(id)) this.state.delete(id);

    for (const task of waiting) {
      const enteredAt = task.updatedAt ? Date.parse(task.updatedAt) : now;
      if (now - enteredAt < afterMs) continue; // not yet due for a first nudge
      const st = this.state.get(task.id) ?? { count: 0, lastNudgedAt: 0 };
      if (!dueForReminder(st, max, repeatMs, now)) continue;
      await this.notifications?.notifyNeedsAttention(task, task.waitReason!, st.count);
      this.state.set(task.id, { count: st.count + 1, lastNudgedAt: now });
    }
  }

  /** Phase 53 C — proactively flag an aged `todo` (ready/blocked but never started)
   *  past the threshold, measured from creation, deduped like the waiting nudges. */
  private async flagAgedTodos(agedMs: number, repeatMs: number, max: number, now: number): Promise<void> {
    const todos = this.tasks.listTasks('todo');
    const live = new Set(todos.map((t) => t.id));
    // Prune once a todo starts / is removed (so a re-queued id nudges afresh).
    for (const id of [...this.todoState.keys()]) if (!live.has(id)) this.todoState.delete(id);

    for (const task of todos) {
      const createdAt = task.createdAt ? Date.parse(task.createdAt) : now;
      const stuckMs = now - createdAt;
      if (stuckMs < agedMs) continue; // not aged enough yet
      const st = this.todoState.get(task.id) ?? { count: 0, lastNudgedAt: 0 };
      if (!dueForReminder(st, max, repeatMs, now)) continue;
      await this.notifications?.notifyStuckTodo(task, Math.floor(stuckMs / 3_600_000), st.count);
      this.todoState.set(task.id, { count: st.count + 1, lastNudgedAt: now });
    }
  }
}

/** Whether a nudge is due: under the cap, and either the first or past the repeat window. */
function dueForReminder(st: NudgeState, max: number, repeatMs: number, now: number): boolean {
  if (st.count >= max) return false; // capped — still visible on the board
  return st.count === 0 || now - st.lastNudgedAt >= repeatMs;
}
