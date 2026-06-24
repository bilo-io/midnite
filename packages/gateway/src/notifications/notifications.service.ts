import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  NOTIFICATION_LIST_DEFAULT_LIMIT,
  notifyForTask,
  type MarkReadRequest,
  type MidniteConfig,
  type Notification,
  type NotificationKind,
  type NotificationListQuery,
  type NotificationListResponse,
  type NotifyDecision,
  type Task,
  type TaskBoardEvent,
  type TeamScope,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { TaskEventBus } from '../tasks/task-event-bus';
import { NotificationDispatcher } from './notification-dispatcher.service';
import { NotificationsRepository } from './notifications.repository';

/**
 * Window over which same-kind transitions coalesce into one notification, so a
 * burst (mass move to done, many agents finishing at once) is a single "N tasks
 * finished" tap rather than a storm.
 */
export const NOTIFICATION_COALESCE_MS = 1500;

const PLURAL_TITLE: Record<NotificationKind, string> = {
  'task.waiting': 'tasks need your input',
  'task.done': 'tasks finished',
  'task.abandoned': 'tasks abandoned',
};

type Pending = { decision: NotifyDecision; task: Task; count: number; timer: NodeJS.Timeout };

/**
 * Phase 21 Theme A — turn notify-worthy task transitions into a stored,
 * policy-filtered, coalesced feed, and emit `notification.created` for live
 * clients. A pure subscriber to {@link TaskEventBus} (no new emit paths).
 * Channel dispatch (browser/webhook) is Theme B; the web feed reads the WS event.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private unsubscribe?: () => void;
  private readonly pending = new Map<NotificationKind, Pending>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(NotificationsRepository) private readonly repo: NotificationsRepository,
    @Inject(NotificationDispatcher) private readonly dispatcher: NotificationDispatcher,
    @Inject(TaskEventBus) private readonly taskBus: TaskEventBus,
  ) {}

  onModuleInit(): void {
    if (!this.config.notifications.enabled) return;
    this.unsubscribe = this.taskBus.subscribe((event) => this.onTaskEvent(event));
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
  }

  // --- read API (controller) ---

  list(query: NotificationListQuery, scope?: TeamScope): NotificationListResponse {
    const limit = query.limit ?? NOTIFICATION_LIST_DEFAULT_LIMIT;
    const rows = this.repo.list(limit, query.offset ?? 0, scope);
    return { notifications: rows.map((r) => this.repo.hydrate(r)), unread: this.repo.countUnread(scope) };
  }

  markRead(req: MarkReadRequest): { unread: number } {
    const at = new Date().toISOString();
    if (req.all) this.repo.markAllRead(at);
    else this.repo.markRead(req.ids ?? [], at);
    return { unread: this.repo.countUnread() };
  }

  clear(): void {
    this.repo.clear();
  }

  // --- ingestion ---

  private onTaskEvent(event: TaskBoardEvent): void {
    if (event.type !== 'task.updated') return;
    const decision = notifyForTask(event.task, this.config.notifications.events);
    if (decision) this.enqueue(decision, event.task);
  }

  /** Buffer a decision by kind; the first in a window arms the coalesce flush. */
  private enqueue(decision: NotifyDecision, task: Task): void {
    const existing = this.pending.get(decision.kind);
    if (existing) {
      existing.count += 1;
      existing.decision = decision;
      existing.task = task; // keep the latest as the representative
      return;
    }
    const timer = setTimeout(() => void this.flush(decision.kind), NOTIFICATION_COALESCE_MS);
    timer.unref?.();
    this.pending.set(decision.kind, { decision, task, count: 1, timer });
  }

  private async flush(kind: NotificationKind): Promise<void> {
    const p = this.pending.get(kind);
    if (!p) return;
    this.pending.delete(kind);
    try {
      const notification = this.persist(p);
      // Persist first (the durable feed), then fan to the enabled channels —
      // the web channel re-emits notification.created over WS for live clients.
      await this.dispatcher.dispatch(notification);
    } catch (err) {
      this.logger.warn(`failed to dispatch ${kind} notification: ${String(err)}`);
    }
  }

  private persist(p: Pending): Notification {
    const coalesced = p.count > 1;
    const row = this.repo.insert({
      id: randomUUID(),
      kind: p.decision.kind,
      severity: p.decision.severity,
      title: coalesced ? `${p.count} ${PLURAL_TITLE[p.decision.kind]}` : p.decision.title,
      body: coalesced ? `${p.count} tasks — latest: ${p.task.title}` : p.decision.body,
      entityType: 'task',
      entityId: p.task.id,
      route: '/tasks',
      readAt: null,
      createdAt: new Date().toISOString(),
      teamId: p.task.teamId ?? null,
    });
    return this.repo.hydrate(row);
  }
}
