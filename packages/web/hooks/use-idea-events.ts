'use client';

import { useEffect, useRef } from 'react';
import { IDEAS_WS_PATH, SequencedIdeaEventSchema } from '@midnite/shared';
import { gatewayWsUrl, getAccessToken } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { ResumeTracker } from '@/lib/resume-cursor';

/**
 * Subscribe to the gateway's live idea WebSocket. Invalidates the query cache
 * on every idea.created / idea.updated / idea.deleted event.
 * Mount once alongside other live-data hooks.
 *
 * Phase 56 B: resumes from the per-channel cursor on reconnect (ring replay) and
 * full-refetches on a `resync-required`, via {@link ResumeTracker}.
 */
export function useIdeaEvents(): void {
  const trackerRef = useRef(
    new ResumeTracker((raw) => {
      const r = SequencedIdeaEventSchema.safeParse(raw);
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
        const wsUrl = `${gatewayWsUrl()}${IDEAS_WS_PATH}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        ws = new WebSocket(wsUrl);
      } catch {
        scheduleReconnect();
        return;
      }
      ws.onopen = () => {
        attempt = 0;
        ws?.send(JSON.stringify(tracker.subscribeMessage()));
      };
      ws.onmessage = (ev) => {
        let raw: unknown;
        try {
          raw = JSON.parse(String(ev.data));
        } catch {
          return; // ignore unparseable frames
        }
        const decision = tracker.accept(raw);
        // A real idea event or a too-big gap both mean "the list changed / may have
        // drifted" → invalidate. watermark / duplicate / ignore are no-ops.
        if (decision.kind === 'event' || decision.kind === 'resync') invalidateData();
      };
      ws.onclose = () => { ws = null; scheduleReconnect(); };
      ws.onerror = () => { try { ws?.close(); } catch { /* closing */ } };
    }

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws?.close(); } catch { /* closing */ }
    };
  }, []);
}
