'use client';

import { useEffect, useRef } from 'react';
import { gatewayWsUrl, getAccessToken } from '@/lib/api';
import { useConnectionStore } from '@/lib/connection-store';

// Phase 56 E — after this many failed reconnect attempts (~several seconds down)
// a channel flips from `reconnecting` to `stale`: data is likely behind.
const STALE_AFTER_ATTEMPTS = 3;

/**
 * Phase 56 D — a channel's transport contract for {@link useReliableSubscription}.
 * Each channel decodes its own wire frames (board channels unwrap the Phase 56 A
 * `SequencedEnvelope` + surface `seq`; approvals decodes its snapshot events with
 * no seq), and supplies its subscribe message (none for approvals).
 */
export type ReliableChannel<T> = {
  /** WS path, e.g. `/ws/tasks`. */
  path: string;
  /** Subscribe message sent on (re)connect, or null if the channel needs none. */
  subscribe: () => unknown | null;
  /** Decode one raw frame → `{ seq?, event }`, or null to drop it. */
  decode: (raw: string) => { seq?: number; event: T } | null;
  /** Append `?token=` (default true). Approvals connects tokenless today. */
  auth?: boolean;
};

export type ReliableHandlers<T> = {
  onEvent: (event: T) => void;
  /** Called on each open with a `send` fn (e.g. to backfill or subscribe-with-args). */
  onOpen?: (send: (msg: unknown) => void) => void;
};

/**
 * Phase 56 D — one resilient WS subscription for every board channel, replacing
 * the four ad-hoc socket hooks. Handles: connect + exponential-backoff reconnect,
 * envelope decode, `lastSeq` tracking (the resume send lands with Theme B's
 * server protocol — today we still send a plain `subscribe`, which is safe), and
 * a `send` for channels that talk back (approvals `decide`).
 *
 * Cache strategy stays with the caller: `onEvent` routes per event type (the hook
 * is transport-only). `enabled: false` disconnects (e.g. a finished workflow run).
 */
export function useReliableSubscription<T>(
  channel: ReliableChannel<T>,
  handlers: ReliableHandlers<T>,
  enabled = true,
): { send: (msg: unknown) => void } {
  const wsRef = useRef<WebSocket | null>(null);
  // Keep handlers current without re-opening the socket on every render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const lastSeqRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let closed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    // Phase 56 E — report this channel's transport state to the global store
    // (actions are stable, so read them once here).
    const { setChannelStatus, clearChannel } = useConnectionStore.getState();

    const scheduleReconnect = () => {
      if (closed) return;
      setChannelStatus(channel.path, attempt >= STALE_AFTER_ATTEMPTS ? 'stale' : 'reconnecting');
      const delay = Math.min(30_000, 500 * 2 ** attempt);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const send = (msg: unknown) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };

    function connect(): void {
      if (closed) return;
      let ws: WebSocket;
      try {
        const token = channel.auth === false ? null : getAccessToken();
        const url = `${gatewayWsUrl()}${channel.path}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setChannelStatus(channel.path, 'live');
        const sub = channel.subscribe();
        if (sub != null) send(sub);
        handlersRef.current.onOpen?.(send);
      };
      ws.onmessage = (ev) => {
        try {
          const decoded = channel.decode(String(ev.data));
          if (!decoded) return;
          // Track the latest seq (groundwork for Theme B resume). No dedup here:
          // a socket can multiplex independent seq lines (team + all scope), so a
          // single global watermark can't tell them apart — that's Theme B's job.
          if (typeof decoded.seq === 'number') lastSeqRef.current = decoded.seq;
          handlersRef.current.onEvent(decoded.event);
        } catch {
          // ignore malformed frames
        }
      };
      ws.onclose = () => {
        wsRef.current = null;
        scheduleReconnect();
      };
      ws.onerror = () => {
        try {
          ws.close();
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
        wsRef.current?.close();
      } catch {
        // already closing
      }
      wsRef.current = null;
      clearChannel(channel.path);
    };
  }, [channel, enabled]);

  return { send: (msg) => wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify(msg)) };
}
