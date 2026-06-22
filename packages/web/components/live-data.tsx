'use client';

import { useTaskEvents } from '@/hooks/use-task-events';

/**
 * Mount-once bridge that wires the gateway's live task-board WebSocket to the
 * app: data invalidation on every task event. Renders nothing. Lives in the
 * (main) layout so it's active on every page without each page re-subscribing.
 *
 * Notifications (in-app toasts + opt-in browser notifications) now flow from the
 * dedicated notification feed/socket via `NotificationsProvider`, which raises
 * them from `notification.created` events — so they match the persisted feed
 * exactly and cover `abandoned` too. The old task-event-driven desktop-notify
 * path was retired here to avoid firing the same alert twice.
 */
export function LiveData(): null {
  useTaskEvents();
  return null;
}
