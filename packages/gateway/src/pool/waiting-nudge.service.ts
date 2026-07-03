import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { isNeedsAttention, type MidniteConfig, type Task } from '@midnite/shared';
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

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Optional() @Inject(NotificationsService) private readonly notifications?: NotificationsService,
  ) {}

  onModuleInit(): void {
    const cfg = this.config.agent.waitingNudge;
    if (cfg.afterHours <= 0) {
      this.logger.log('waiting nudges disabled (agent.waitingNudge.afterHours = 0)');
      return;
    }
    this.timer = setInterval(() => void this.tick(), cfg.tickMs);
    this.timer.unref?.();
    this.logger.log(
      `waiting-nudge loop started (afterHours=${cfg.afterHours}, repeatHours=${cfg.repeatHours}, max=${cfg.maxReminders})`,
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
    if (cfg.afterHours <= 0) return; // nudges disabled (behaviour-preserving default)
    if (this.running) return;
    this.running = true;
    try {
      const afterMs = cfg.afterHours * 3_600_000;
      const repeatMs = cfg.repeatHours * 3_600_000;

      const waiting = this.tasks
        .listTasks('waiting')
        .filter((t) => isNeedsAttention(t.waitReason));
      const live = new Set(waiting.map((t) => t.id));
      // Prune tasks that have left the needs-attention set (resolved / moved).
      for (const id of [...this.state.keys()]) if (!live.has(id)) this.state.delete(id);

      for (const task of waiting) {
        const enteredAt = task.updatedAt ? Date.parse(task.updatedAt) : now;
        if (now - enteredAt < afterMs) continue; // not yet due for a first nudge

        const st = this.state.get(task.id) ?? { count: 0, lastNudgedAt: 0 };
        if (st.count >= cfg.maxReminders) continue; // capped — still visible on the board
        const due = st.count === 0 || now - st.lastNudgedAt >= repeatMs;
        if (!due) continue;

        await this.nudge(task, st, now);
      }
    } catch (err) {
      this.logger.warn(`waiting-nudge tick failed: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      this.running = false;
    }
  }

  private async nudge(task: Task, st: NudgeState, now: number): Promise<void> {
    // waitReason is guaranteed present + needs-attention by the caller's filter.
    await this.notifications?.notifyNeedsAttention(task, task.waitReason!, st.count);
    this.state.set(task.id, { count: st.count + 1, lastNudgedAt: now });
  }
}
