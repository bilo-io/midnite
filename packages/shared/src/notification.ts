import { z } from 'zod';
import type { NotificationsConfig } from './config.js';
import type { Task } from './task.js';

/**
 * Notifications & alerting contract (Phase 21). The gateway turns notify-worthy
 * state transitions into stored `Notification`s and fans them to clients over a
 * WS `notification.created` event + the persisted feed.
 */

export const NOTIFICATION_SEVERITIES = ['info', 'warn', 'urgent'] as const;
export const NotificationSeveritySchema = z.enum(NOTIFICATION_SEVERITIES);
export type NotificationSeverity = z.infer<typeof NotificationSeveritySchema>;

/** What produced a notification — drives copy/icon and lets clients group.
 *  `agent.held` (Phase 50 Theme B) fires when the scheduler blocks spawns on a
 *  hard budget/rate cap — a system-level guardrail alert, not a task transition. */
export const NOTIFICATION_KINDS = [
  'task.waiting',
  'task.done',
  'task.abandoned',
  'agent.held',
  // Phase 53 Theme D — a task escalated to needs-attention that has sat in
  // `waiting` past the nudge threshold; an escalating reminder, distinct from the
  // routine `task.waiting` transition alert.
  'task.needs-attention',
  // Phase 49 F — a scheduled auto-backup run failed (fail-open: logged + this
  // alert, never crashes the tick).
  'backup.failed',
  // Phase 62 C — the `midnite.notify` workflow node: a fleet digest was generated
  // (`digest.generated`) or a notable retrospective landed (`retro.notable`, e.g.
  // an abandoned / retries-exhausted / gate-failed task).
  'digest.generated',
  'retro.notable',
] as const;
export const NotificationKindSchema = z.enum(NOTIFICATION_KINDS);
export type NotificationKind = z.infer<typeof NotificationKindSchema>;

export const NotificationEntitySchema = z.object({
  type: z.string(),
  id: z.string(),
});

export const NotificationSchema = z.object({
  id: z.string(),
  kind: NotificationKindSchema,
  severity: NotificationSeveritySchema,
  title: z.string(),
  body: z.string(),
  entity: NotificationEntitySchema,
  /** Where the client navigates to open the source entity. */
  route: z.string(),
  /** ISO timestamp when read, or null while unread. */
  readAt: z.string().nullable(),
  createdAt: z.string(),
  /** Team this notification belongs to; null = visible to all (system/legacy). */
  teamId: z.string().nullable().optional(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// --- REST contract ---

export const NOTIFICATION_LIST_DEFAULT_LIMIT = 50;
export const NOTIFICATION_LIST_MAX_LIMIT = 200;

export const NotificationListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(NOTIFICATION_LIST_MAX_LIMIT).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  unread: z.number().int().nonnegative(),
});
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

/** Mark specific ids read, or all of them. */
export const MarkReadRequestSchema = z
  .object({ ids: z.array(z.string()).optional(), all: z.boolean().optional() })
  .refine((v) => v.all === true || (v.ids?.length ?? 0) > 0, {
    message: 'provide ids[] or all:true',
  });
export type MarkReadRequest = z.infer<typeof MarkReadRequestSchema>;

// --- WS event ---

export const NOTIFICATIONS_WS_PATH = '/ws/notifications';

export const NotificationEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('notification.created'), notification: NotificationSchema }),
]);
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

export const NotificationSubscribeMessageSchema = z.object({ type: z.literal('subscribe') });
export type NotificationSubscribeMessage = z.infer<typeof NotificationSubscribeMessageSchema>;

// --- Policy ---

/** The notify decision for a transition: the copy + severity, or null = no notify. */
export type NotifyDecision = {
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
};

/**
 * The default notify-policy as data, not scattered `if`s: map a task's *current*
 * status to a notify decision, honouring the per-event toggles. Only the three
 * "you might be needed" transitions notify; everything else returns null.
 * Pure — the gateway calls this on each `task.updated`.
 */
export function notifyForTask(task: Task, events: NotificationsConfig['events']): NotifyDecision | null {
  switch (task.status) {
    case 'waiting':
      return events.taskWaiting
        ? { kind: 'task.waiting', severity: 'warn', title: 'Agent needs your input', body: task.title }
        : null;
    case 'done':
      return events.taskDone
        ? { kind: 'task.done', severity: 'info', title: 'Task finished', body: task.title }
        : null;
    case 'abandoned':
      return events.taskAbandoned
        ? { kind: 'task.abandoned', severity: 'urgent', title: 'Task abandoned', body: task.title }
        : null;
    default:
      return null;
  }
}
