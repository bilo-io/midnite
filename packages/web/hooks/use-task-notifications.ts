'use client';

import { useCallback, useRef } from 'react';
import type { Status, TaskBoardEvent } from '@midnite/shared';
import { AppSettings, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useTaskEventListener } from '@/lib/task-events';

// Only these transitions are worth interrupting the user for.
const NOTIFY_STATUSES: ReadonlySet<Status> = new Set<Status>(['waiting', 'done']);

const TITLE: Partial<Record<Status, string>> = {
  waiting: 'Task needs your input',
  done: 'Task complete',
};

/**
 * Fire a desktop notification when a task transitions to `waiting` (needs input)
 * or `done`. Opt-in via `settings.notifyTaskUpdates` (which prompts for the
 * Notification permission). Driven by the live task-event stream, so it works
 * for agent-driven transitions, not just local actions. The web Notification
 * API maps to native notifications inside the Electron desktop app too.
 */
export function useTaskNotifications(): void {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const enabled = settings.notifyTaskUpdates;
  // Last status we saw per task, so we only notify on the *transition* into a
  // notify-worthy status — not on every unrelated update while it's there.
  const lastStatus = useRef<Map<string, Status>>(new Map());

  const handler = useCallback(
    (event: TaskBoardEvent) => {
      if (event.type === 'task.deleted') {
        lastStatus.current.delete(event.id);
        return;
      }
      // Bulk creates land tasks in backlog/todo (never a notify-worthy status)
      // and carry no single task — they're a board-refresh signal, skip them.
      if (event.type === 'tasks.bulkCreated') return;
      const { task } = event;
      const prev = lastStatus.current.get(task.id);
      lastStatus.current.set(task.id, task.status);
      if (!enabled) return;
      if (prev === task.status) return; // no transition
      if (!NOTIFY_STATUSES.has(task.status)) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      try {
        new Notification(TITLE[task.status] ?? 'Task updated', {
          body: task.title,
          tag: `midnite-task-${task.id}`,
        });
      } catch {
        // notifications can throw if construction is blocked; ignore
      }
    },
    [enabled],
  );

  useTaskEventListener(handler);
}
