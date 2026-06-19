'use client';

import { useEffect } from 'react';
import type { TaskBoardEvent } from '@midnite/shared';

/**
 * Client-side fan-out for parsed task-board events. The single live WS hook
 * ({@link useTaskEvents}) feeds events in here; interested consumers (e.g.
 * desktop notifications) subscribe — so we keep one socket, not one per feature.
 */
const listeners = new Set<(event: TaskBoardEvent) => void>();

export function emitTaskEvent(event: TaskBoardEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // a broken consumer must not break the others
    }
  }
}

/** Subscribe to task events for the component's lifetime. `handler` must be stable. */
export function useTaskEventListener(handler: (event: TaskBoardEvent) => void): void {
  useEffect(() => {
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, [handler]);
}
