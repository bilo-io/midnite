'use client';

import { useTaskEvents } from '@/hooks/use-task-events';
import { useTaskNotifications } from '@/hooks/use-task-notifications';

/**
 * Mount-once bridge that wires the gateway's live task-board WebSocket to the
 * app: data invalidation (always) and opt-in desktop notifications. Renders
 * nothing. Lives in the (main) layout so it's active on every page without each
 * page re-subscribing.
 */
export function LiveData(): null {
  useTaskEvents();
  useTaskNotifications();
  return null;
}
