'use client';

import { useEffect, useRef } from 'react';
import { TASKS_WS_PATH, SequencedTaskBoardEventSchema } from '@midnite/shared';
import { gatewayWsUrl, getAccessToken } from '@/lib/api';
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
  // Phase 56 A: the highest seq applied on this channel. Tracked now (the resume
  // protocol in Theme B will send it on reconnect); used here to drop already-
  // applied frames so a future replay+live overlap is idempotent.
  const lastSeqRef = useRef(0);
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
        const token = getAccessToken();
        const wsUrl = `${gatewayWsUrl()}${TASKS_WS_PATH}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        ws = new WebSocket(wsUrl);
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
          // Phase 56 A: frames arrive wrapped in a sequenced envelope — unwrap it.
          // We record the latest seq (groundwork for Theme B's resume) but do NOT
          // dedup on it here: one /ws/tasks socket multiplexes two independent seq
          // lines (team-scoped task events + the all-scoped activity/bulk stream),
          // so a single global watermark can't tell them apart. Per-channel dedup
          // arrives with the resume protocol in Theme B.
          const parsed = SequencedTaskBoardEventSchema.safeParse(JSON.parse(String(ev.data)));
          if (!parsed.success) return;
          const { seq, event } = parsed.data;
          lastSeqRef.current = seq;
          // Activity / attention events are ephemeral (agent state, not board state)
          // — consumers patch the office store directly (Theme E). Skipping
          // invalidateData() here avoids a full sessions+tasks refetch on every
          // tool call, which can be several times per second.
          const isEphemeral =
            event.type === 'agent.activity' ||
            event.type === 'agent.attention' ||
            event.type === 'guardrails.updated';
          if (!isEphemeral) invalidateData();
          emitTaskEvent(event);
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
