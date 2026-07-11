import type { NotificationKind, NotificationSeverity } from '@midnite/shared';

/**
 * Narrow in-app notification port (Phase 62 C). Lets the `midnite.notify`
 * workflow node post a notification WITHOUT importing `NotificationsModule`
 * (which subscribes to the task bus and would pull the workflows graph into a
 * cycle). Bound lazily to {@link NotificationsService.notifyDirect} via
 * `ModuleRef`, mirroring the `TASK_CREATOR` pattern.
 */
export interface NotifyInput {
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  route: string;
  teamId?: string | null;
}

export interface Notifier {
  /** Resolves `true` when the notification was persisted + dispatched, `false`
   *  when notifications are disabled or dispatch failed (best-effort, never throws). */
  notify(input: NotifyInput): Promise<boolean>;
}

export const NOTIFIER = Symbol('NOTIFIER');
