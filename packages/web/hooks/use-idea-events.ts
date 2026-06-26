'use client';

import { useEffect } from 'react';
import { IDEAS_WS_PATH, IdeaEventSchema } from '@midnite/shared';
import { gatewayWsUrl, getAccessToken } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';

/**
 * Subscribe to the gateway's live idea WebSocket. Invalidates the query cache
 * on every idea.created / idea.updated / idea.deleted event.
 * Mount once alongside other live-data hooks.
 */
export function useIdeaEvents(): void {
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
        const wsUrl = `${gatewayWsUrl()}${IDEAS_WS_PATH}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
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
        try {
          const parsed = IdeaEventSchema.safeParse(JSON.parse(String(ev.data)));
          if (parsed.success) invalidateData();
        } catch {
          // ignore unparseable frames
        }
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
