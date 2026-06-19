'use client';

import { useEffect } from 'react';
import { TASKS_WS_PATH, TaskBoardEventSchema } from '@midnite/shared';
import { gatewayWsUrl } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { emitTaskEvent } from '@/lib/task-events';

/**
 * Subscribe to the gateway's live task-board WebSocket. On any task event
 * (created / updated / deleted — including transitions driven by agents or other
 * clients) it calls {@link invalidateData}, so every mounted data hook refetches
 * immediately instead of waiting for the next poll. Polling stays as a fallback
 * for when the socket is down (capped-backoff reconnect here).
 *
 * Payload-agnostic by design: we don't patch caches, we just invalidate — the
 * same coarse model the rest of the app uses. Mount once (see `LiveData`).
 */
export function useTaskEvents(): void {
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleReconnect(): void {
      if (closed) return;
      const delay = Math.min(30_000, 500 * 2 ** attempt);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    }

    function connect(): void {
      if (closed) return;
      try {
        ws = new WebSocket(`${gatewayWsUrl()}${TASKS_WS_PATH}`);
      } catch {
        scheduleReconnect();
        return;
      }
      ws.onopen = () => {
        attempt = 0;
        ws?.send(JSON.stringify({ type: 'subscribe' }));
      };
      ws.onmessage = (ev) => {
        // Validate defensively so a malformed frame can't trigger refetch churn.
        try {
          const parsed = TaskBoardEventSchema.safeParse(JSON.parse(String(ev.data)));
          if (parsed.success) {
            invalidateData();
            emitTaskEvent(parsed.data);
          }
        } catch {
          // ignore unparseable frames
        }
      };
      ws.onclose = () => {
        ws = null;
        scheduleReconnect();
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          // already closing
        }
      };
    }

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        // already closing
      }
    };
  }, []);
}
