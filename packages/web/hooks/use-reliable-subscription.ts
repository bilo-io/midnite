'use client';

import { useEffect, useRef } from 'react';
import { gatewayWsUrl, getAccessToken, refreshAccessToken } from '@/lib/api';
import { ResumeTracker } from '@/lib/resume-cursor';
import { useConnectionStore } from '@/lib/connection-store';

// Phase 56 E — after this many failed reconnect attempts (~several seconds down)
// a channel flips from `reconnecting` to `stale`: data is likely behind.
const STALE_AFTER_ATTEMPTS = 3;

/**
 * Phase 56 D — a channel's transport contract for {@link useReliableSubscription}.
 * Each channel decodes its own wire frames (board channels unwrap the Phase 56 A
 * `SequencedEnvelope` + surface `seq`/`ch`; approvals decodes its snapshot events
 * with no seq), and supplies its subscribe message (none for approvals).
 */
export type ReliableChannel<T> = {
  /** WS path, e.g. `/ws/tasks`. */
  path: string;
  /**
   * Subscribe message sent on connect, or null if the channel needs none
   * (approvals). A non-null result also marks the channel **resumable**: the
   * hook drives the Phase 56 B resume protocol (per-`ch` cursor, replay, resync)
   * and, on reconnect, upgrades this to a `resume` frame carrying the cursor —
   * so a channel only needs to return its static extras here (e.g. `{}`).
   */
  subscribe: () => unknown | null;
  /** Decode one raw frame → `{ seq?, ch?, event }`, or null to drop it. */
  decode: (raw: string) => { seq?: number; ch?: string; event: T } | null;
  /** Append `?token=` (default true). Approvals connects tokenless today. */
  auth?: boolean;
};

export type ReliableHandlers<T> = {
  onEvent: (event: T) => void;
  /**
   * Phase 56 B — the server couldn't replay the gap (buffer overrun or a gateway
   * restart), so the client must full-refetch rather than apply a partial stream.
   * Resumable channels pass this (e.g. `invalidateData`).
   */
  onResync?: () => void;
  /** Called on each open with a `send` fn (e.g. to backfill or subscribe-with-args). */
  onOpen?: (send: (msg: unknown) => void) => void;
};

/**
 * Phase 56 D — one resilient WS subscription for every board channel, replacing
 * the four ad-hoc socket hooks. Handles: connect + exponential-backoff reconnect,
 * envelope decode, and (Phase 56 B) the **resume protocol** — on reconnect it
 * sends `resume` with a per-`ch` cursor so the gateway replays what the socket
 * missed, dedups replay+live overlap by `(ch, seq)`, and calls `onResync` when
 * the gap is too big. Snapshot channels (approvals: `subscribe() === null`) skip
 * all of that and just decode → `onEvent` as before.
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

  useEffect(() => {
    if (!enabled) return;
    let closed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    // Phase 56 E — report this channel's transport state to the global store
    // (actions are stable, so read them once here).
    const { setChannelStatus, clearChannel } = useConnectionStore.getState();

    // Resumable if the channel sends a subscribe message. The tracker persists
    // across reconnects within this effect run (so `resume` carries the real
    // cursor); a remount / channel change starts fresh.
    const resumable = channel.subscribe() != null;
    const tracker = new ResumeTracker<T>((raw) => {
      try {
        const d = channel.decode(String(raw));
        return d && typeof d.seq === 'number' ? { seq: d.seq, ch: d.ch, event: d.event } : null;
      } catch {
        return null;
      }
    });

    const scheduleReconnect = (closeCode?: number) => {
      if (closed) return;
      setChannelStatus(channel.path, attempt >= STALE_AFTER_ATTEMPTS ? 'stale' : 'reconnecting');
      const delay = Math.min(30_000, 500 * 2 ** attempt);
      attempt += 1;
      // A `4001` close means the token is invalid/expired — reconnecting with the same
      // token loops forever. Refresh first so the retry carries a live token.
      reconnectTimer = setTimeout(() => {
        if (closed) return;
        if (closeCode === 4001) void refreshAccessToken().finally(connect);
        else connect();
      }, delay);
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
        // Send the handshake down *this* socket rather than through `wsRef`. The
        // subscribe/resume frame is the one message that must never be dropped —
        // the gateway only registers a client once it arrives, so a socket that
        // opens without it receives events forever after (see the `onclose`
        // guard below for how the ref could go stale underneath us).
        const sendHere = (msg: unknown) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
        };
        if (resumable) {
          // `subscribe` on a fresh cursor, `resume` (+ cursor) after a drop. The
          // channel's own `type` is owned by the protocol — keep only its extras.
          const base = (channel.subscribe() ?? {}) as Record<string, unknown>;
          const { type: _ignored, ...extra } = base;
          sendHere(tracker.subscribeMessage(extra));
        } else {
          const sub = channel.subscribe();
          if (sub != null) sendHere(sub);
        }
        handlersRef.current.onOpen?.(send);
      };
      ws.onmessage = (ev) => {
        const text = String(ev.data);
        if (!resumable) {
          // Snapshot channel — no seq/resume; decode straight through.
          try {
            const decoded = channel.decode(text);
            if (decoded) handlersRef.current.onEvent(decoded.event);
          } catch {
            // ignore malformed frames
          }
          return;
        }
        const decision = tracker.accept(text);
        if (decision.kind === 'resync') {
          handlersRef.current.onResync?.();
          return;
        }
        if (decision.kind === 'event') handlersRef.current.onEvent(decision.event);
        // watermark / duplicate / ignore → nothing
      };
      ws.onclose = (ev) => {
        // Only disown the socket if it is still the live one. `wsRef` is shared
        // across effect runs, and React's dev-mode double-invoke closes the first
        // socket *while it is still CONNECTING* — that `close` event lands after
        // the second run has already stored its own socket in the ref, so an
        // unguarded reset here orphans a perfectly healthy socket and the board
        // silently never receives another event.
        if (wsRef.current === ws) wsRef.current = null;
        scheduleReconnect(ev.code);
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
