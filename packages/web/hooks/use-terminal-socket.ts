'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ServerTerminalMessageSchema,
  TERMINAL_WS_PATH,
  type ApprovalDecision,
  type TerminalApprovalRequestMessage,
  type TerminalStatusPhase,
} from '@midnite/shared';
import { ApiError, gatewayWsUrl, getAccessToken, mintTerminalToken, refreshAccessToken } from '@/lib/api';

export type TerminalConnectionState = 'connecting' | 'open' | 'closed' | 'error';

type Args = {
  /** The PTY key to mint a token for and attach to — a session id or an ad-hoc id. */
  attachId: string;
  /** Open the socket only once the terminal is mounted and sized. */
  enabled: boolean;
  /** Raw PTY bytes for the terminal to render. */
  onOutput: (bytes: Uint8Array) => void;
  onStatus?: (phase: TerminalStatusPhase, command?: string) => void;
  /** The gateway couldn't replay a continuous stream from our last seq (the
   *  scrollback ring rolled past it during a long disconnect) — clear the screen;
   *  the fresh ring replay that follows re-renders the recoverable transcript. */
  onResync?: () => void;
  /** The agent is requesting approval for a tool call. */
  onApprovalRequest?: (request: TerminalApprovalRequestMessage) => void;
  /** A pending approval was resolved (answered, auto-allowed, or timed out). */
  onApprovalResolved?: (requestId: string) => void;
  initialGeometry?: { cols: number; rows: number };
};

type Result = {
  connectionState: TerminalConnectionState;
  sendInput: (data: string) => void;
  sendResize: (cols: number, rows: number) => void;
  sendApproval: (requestId: string, decision: ApprovalDecision) => void;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Opens a 2-way WebSocket to the gateway's live terminal: mints a token, attaches
 * to the session's PTY, streams output to `onOutput`, and exposes input/resize
 * senders. Reconnects with capped backoff while `enabled`.
 */
export function useTerminalSocket({
  attachId,
  enabled,
  onOutput,
  onStatus,
  onResync,
  onApprovalRequest,
  onApprovalResolved,
  initialGeometry,
}: Args): Result {
  const wsRef = useRef<WebSocket | null>(null);
  const geomRef = useRef(initialGeometry ?? { cols: 80, rows: 24 });
  // Highest output seq already written to the terminal. On reconnect the gateway
  // replays its ring buffer; without this the same xterm would re-render
  // scrollback it already has. Persists across reconnects, resets per session.
  const lastSeqRef = useRef(-1);
  const [connectionState, setConnectionState] = useState<TerminalConnectionState>('closed');

  // Keep callbacks in refs so the connection lifecycle isn't torn down when a
  // parent re-renders with new closures.
  const onOutputRef = useRef(onOutput);
  onOutputRef.current = onOutput;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const onResyncRef = useRef(onResync);
  onResyncRef.current = onResync;
  const onApprovalRequestRef = useRef(onApprovalRequest);
  onApprovalRequestRef.current = onApprovalRequest;
  const onApprovalResolvedRef = useRef(onApprovalResolved);
  onApprovalResolvedRef.current = onApprovalResolved;

  useEffect(() => {
    if (!enabled || !attachId) {
      setConnectionState('closed');
      return;
    }

    lastSeqRef.current = -1; // fresh session/PTY — accept all output
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReconnect = (refreshFirst = false) => {
      if (cancelled) return;
      const delay = Math.min(5000, 500 * 2 ** attempt);
      attempt += 1;
      // An expired access token fails both the token mint (401) and the WS handshake
      // (4001 close). Reconnecting with the same token loops; refresh first so the
      // retry carries a live token.
      timer = setTimeout(() => {
        if (cancelled) return;
        if (refreshFirst) void refreshAccessToken().finally(() => void open());
        else void open();
      }, delay);
    };

    const open = async () => {
      setConnectionState('connecting');
      let token: string;
      try {
        token = (await mintTerminalToken(attachId)).token;
      } catch (err) {
        if (cancelled) return;
        setConnectionState('error');
        scheduleReconnect(err instanceof ApiError && err.status === 401);
        return;
      }
      if (cancelled) return;

      const jwtToken = getAccessToken();
      const termWsUrl = `${gatewayWsUrl()}${TERMINAL_WS_PATH}${jwtToken ? `?token=${encodeURIComponent(jwtToken)}` : ''}`;
      const ws = new WebSocket(termWsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnectionState('open');
        const { cols, rows } = geomRef.current;
        // A reconnect (we've already rendered frames) resumes with our lastSeq so
        // the gateway can replay just what we missed — or tell us to resync if the
        // ring rolled past it. A fresh connection attaches.
        const lastSeq = lastSeqRef.current;
        ws.send(
          JSON.stringify(
            lastSeq >= 0
              ? { type: 'resume', sessionId: attachId, token, cols, rows, lastSeq }
              : { type: 'attach', sessionId: attachId, token, cols, rows },
          ),
        );
      };

      ws.onmessage = (ev: MessageEvent) => {
        const text =
          typeof ev.data === 'string'
            ? ev.data
            : new TextDecoder().decode(ev.data as ArrayBuffer);
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return;
        }
        const result = ServerTerminalMessageSchema.safeParse(parsed);
        if (!result.success) return;
        const message = result.data;
        if (message.type === 'output') {
          // Drop frames already rendered (ring replay on reconnect); accept the rest.
          if (message.seq <= lastSeqRef.current) return;
          lastSeqRef.current = message.seq;
          onOutputRef.current(base64ToBytes(message.data));
        } else if (message.type === 'resync-required') {
          // The ring rolled past our position — drop our seq and clear the screen;
          // the full ring replay that follows re-renders us fresh.
          lastSeqRef.current = -1;
          onResyncRef.current?.();
        } else if (message.type === 'status') {
          // A freshly-spawned PTY restarts seq at 0; a reattach keeps the old PTY's.
          if (message.phase === 'ready') lastSeqRef.current = -1;
          onStatusRef.current?.(message.phase, message.command);
        } else if (message.type === 'approval-request') {
          onApprovalRequestRef.current?.(message);
        } else if (message.type === 'approval-resolved') {
          onApprovalResolvedRef.current?.(message.requestId);
        } else if (message.type === 'error') {
          setConnectionState('error');
        }
      };

      ws.onerror = () => {
        if (!cancelled) setConnectionState('error');
      };

      ws.onclose = (ev) => {
        wsRef.current = null;
        if (cancelled) return;
        setConnectionState('closed');
        scheduleReconnect(ev.code === 4001);
      };
    };

    void open();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // already closing
        }
        wsRef.current = null;
      }
    };
  }, [enabled, attachId]);

  const sendInput = useCallback((data: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ type: 'input', data: bytesToBase64(new TextEncoder().encode(data)) }),
      );
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    geomRef.current = { cols, rows };
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  const sendApproval = useCallback((requestId: string, decision: ApprovalDecision) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'approval-response', requestId, decision }));
    }
  }, []);

  return { connectionState, sendInput, sendResize, sendApproval };
}
