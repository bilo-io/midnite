import type { Notification, NotificationsConfig } from '@midnite/shared';

/**
 * A notification sink (Phase 21 Theme B). One interface, N implementations — the
 * same shape as the workflow node executors and the Phase 17 spawner. The
 * dispatcher fans each persisted notification to every channel that's `enabled`
 * under the current config. Adding Slack/email later (Phase 14) is just another
 * `NotificationChannel`.
 */
export interface NotificationChannel {
  /** Stable id for logging + config lookups. */
  readonly name: string;
  /** Whether this channel fires under the current config. */
  enabled(config: NotificationsConfig): boolean;
  /** Deliver one notification. Best-effort: the dispatcher isolates failures. */
  send(notification: Notification): Promise<void>;
}

/** DI token collecting every registered channel (mirrors `NODE_EXECUTORS`). */
export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');
