import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  isNeedsAttention,
  type DoctorTaskRef,
  type MidniteConfig,
  type Task,
  type TasksDoctorReport,
  type TeamScope,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { TerminalService } from '../terminal/terminal.service';
import { TasksService } from './tasks.service';

/**
 * Phase 53 Theme E — the operator's "what's wedged?" report (`GET /tasks/doctor`).
 * Everything is **derived** on read from the (team-scoped) task list, the live
 * session heartbeats (via {@link TerminalService.agentRunHealth}), and the recent
 * `task_failures` window — nothing new is stored. Thresholds are presentational
 * (`config.agent.doctor.*`); a `0` threshold disables that bucket.
 *
 * Lives in its own module so it can read both tasks and terminal health without
 * `TasksModule` taking a dependency on `TerminalModule` (which already depends on
 * tasks — that would be a cycle).
 */
@Injectable()
export class TasksDoctorService {
  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksService) private readonly tasks: TasksService,
    // Optional so a partial-install / unit spec without the terminal still yields
    // a report (stuck-wip idle can't be measured, so that bucket is empty).
    @Optional() @Inject(TerminalService) private readonly terminal?: TerminalService,
  ) {}

  report(scope?: TeamScope): TasksDoctorReport {
    const now = Date.now();
    const d = this.config.agent.doctor;
    const wipSilentMs = d.wipSilentMinutes * 60_000;
    const agedTodoMs = d.agedTodoHours * 3_600_000;
    const waitingTooLongMs = d.waitingTooLongHours * 3_600_000;

    const tasks = this.tasks.listTasks(undefined, undefined, scope);
    const bySince = (a: DoctorTaskRef, b: DoctorTaskRef) => b.sinceMs - a.sinceMs;

    // Needs-attention: a failure `waitReason` (not a live needs-input block).
    const attention = tasks.filter((t) => t.status === 'waiting' && isNeedsAttention(t.waitReason));
    const needsAttention = attention.map((t) => this.ref(t, 0));

    // …of those, the ones parked in `waiting` past the threshold.
    const waitingTooLong =
      waitingTooLongMs > 0
        ? attention
            .map((t) => this.ref(t, now - this.parse(t.updatedAt, now)))
            .filter((r) => r.sinceMs >= waitingTooLongMs)
            .sort(bySince)
        : [];

    // Aged todo: ready-or-blocked but sitting unstarted past the threshold.
    const agedTodo =
      agedTodoMs > 0
        ? tasks
            .filter((t) => t.status === 'todo')
            .map((t) => this.ref(t, now - this.parse(t.createdAt, now)))
            .filter((r) => r.sinceMs >= agedTodoMs)
            .sort(bySince)
        : [];

    // Stuck wip: a live session silent past the threshold (needs the heartbeat).
    const stuckWip =
      wipSilentMs > 0 && this.terminal
        ? tasks
            .filter((t) => t.status === 'wip')
            .map((t) => ({ t, idle: this.terminal!.agentRunHealth(t.sessionId ?? t.id)?.idleMs }))
            .filter((x): x is { t: Task; idle: number } => x.idle != null && x.idle >= wipSilentMs)
            .map((x) => this.ref(x.t, x.idle))
            .sort(bySince)
        : [];

    const recentFailures = this.tasks.listRecentFailures({ limit: d.recentFailuresLimit }, scope);
    const failureCountsByClass: Record<string, number> = {};
    for (const f of recentFailures) {
      failureCountsByClass[f.class] = (failureCountsByClass[f.class] ?? 0) + 1;
    }

    return {
      generatedAt: new Date(now).toISOString(),
      needsAttention,
      stuckWip,
      agedTodo,
      waitingTooLong,
      failureCountsByClass,
      recentFailures,
      thresholds: { wipSilentMs, agedTodoMs, waitingTooLongMs },
    };
  }

  private ref(t: Task, sinceMs: number): DoctorTaskRef {
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      repo: t.repo,
      waitReason: t.waitReason ?? undefined,
      retryCount: t.retryCount ?? 0,
      sinceMs: Math.max(0, sinceMs),
    };
  }

  private parse(iso: string | undefined, fallback: number): number {
    if (!iso) return fallback;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? fallback : t;
  }
}
