'use client';

import { useEffect, useRef } from 'react';
import { TASKS_WS_PATH, SequencedTaskBoardEventSchema } from '@midnite/shared';
import { gatewayWsUrl, getAccessToken } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { emitTaskEvent } from '@/lib/task-events';
import { ResumeTracker } from '@/lib/resume-cursor';

/**
 * Subscribe to the gateway's live task-board WebSocket. On any task event
 * (created / updated / deleted — including transitions driven by agents or other
 * clients) it calls {@link invalidateData}, so every mounted data hook refetches
 * immediately instead of waiting for the next poll. Polling stays as a fallback
 * for when the socket is down (capped-backoff reconnect here).
 *
 * Payload-agnostic by design: we don't patch caches, we just invalidate — the
 * same coarse model the rest of the app uses. Mount once (see `LiveData`).
 *
 * Phase 56 B: a {@link ResumeTracker} tracks the per-channel `lastSeq`, so on
 * reconnect we `resume` (the gateway replays what we missed from its ring) and
 * dedup replay+live overlap; on a gap too big to replay the gateway sends
 * `resync-required` and we full-refetch.
 */
export function useTaskEvents(): void {
  // Persists across reconnects (component lifetime) so `resume` carries the real
  // cursor. Recreated only on remount — a fresh mount is a fresh `subscribe`.
  const trackerRef = useRef(
    new ResumeTracker((raw) => {
      const r = SequencedTaskBoardEventSchema.safeParse(raw);
      return r.success ? r.data : null;
    }),
  );
  useEffect(() => {
    const tracker = trackerRef.current;
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
        // Fresh mount → `subscribe`; reconnect with a known cursor → `resume`.
        ws?.send(JSON.stringify(tracker.subscribeMessage()));
      };
      ws.onmessage = (ev) => {
        // Validate defensively so a malformed frame can't trigger refetch churn.
        let raw: unknown;
        try {
          raw = JSON.parse(String(ev.data));
        } catch {
          return; // ignore unparseable frames
        }
        const decision = tracker.accept(raw);
        if (decision.kind === 'resync') {
          // Gap too big to replay → full refetch rather than a drift-prone stream.
          invalidateData();
          return;
        }
        if (decision.kind !== 'event') return; // watermark / duplicate / ignore
        const { event } = decision;
        // Activity / attention events are ephemeral (agent state, not board state)
        // — consumers patch the office store directly. Skipping invalidateData()
        // here avoids a full sessions+tasks refetch on every tool call.
        const isEphemeral =
          event.type === 'agent.activity' ||
          event.type === 'agent.attention' ||
          event.type === 'guardrails.updated';
        if (!isEphemeral) invalidateData();
        emitTaskEvent(event);
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
