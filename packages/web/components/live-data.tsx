'use client';

import { useTaskEvents } from '@/hooks/use-task-events';

/**
 * Mount-once bridge that wires the gateway's live task-board WebSocket to the
 * app's data-invalidation pub/sub. Renders nothing. Lives in the (main) layout
 * so the board stays live on every page without each page re-subscribing.
 */
export function LiveData(): null {
  useTaskEvents();
  return null;
}
