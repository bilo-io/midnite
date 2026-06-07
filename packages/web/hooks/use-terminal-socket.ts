'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ServerTerminalMessageSchema,
  TERMINAL_WS_PATH,
  type TerminalStatusPhase,
} from '@midnite/shared';
import { gatewayWsUrl, mintTerminalToken } from '@/lib/api';

export type TerminalConnectionState = 'connecting' | 'open' | 'closed' | 'error';

type Args = {
  sessionId: string;
  /** Open the socket only once the terminal is mounted and sized. */
  enabled: boolean;
  /** Raw PTY bytes for the terminal to render. */
  onOutput: (bytes: Uint8Array) => void;
  onStatus?: (phase: TerminalStatusPhase) => void;
  initialGeometry?: { cols: number; rows: number };
};

type Result = {
  connectionState: TerminalConnectionState;
  sendInput: (data: string) => void;
  sendResize: (cols: number, rows: number) => void;
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
  sessionId,
  enabled,
  onOutput,
  onStatus,
  initialGeometry,
}: Args): Result {
  const wsRef = useRef<WebSocket | null>(null);
  const geomRef = useRef(initialGeometry ?? { cols: 80, rows: 24 });
  const [connectionState, setConnectionState] = useState<TerminalConnectionState>('closed');

  // Keep callbacks in refs so the connection lifecycle isn't torn down when a
  // parent re-renders with new closures.
  const onOutputRef = useRef(onOutput);
  onOutputRef.current = onOutput;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!enabled || !sessionId) {
      setConnectionState('closed');
      return;
    }

    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReconnect = () => {
      if (cancelled) return;
      const delay = Math.min(5000, 500 * 2 ** attempt);
      attempt += 1;
      timer = setTimeout(() => void open(), delay);
    };

    const open = async () => {
      setConnectionState('connecting');
      let token: string;
      try {
        token = (await mintTerminalToken(sessionId)).token;
      } catch {
        if (cancelled) return;
        setConnectionState('error');
        scheduleReconnect();
        return;
      }
      if (cancelled) return;

      const ws = new WebSocket(gatewayWsUrl() + TERMINAL_WS_PATH);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnectionState('open');
        const { cols, rows } = geomRef.current;
        ws.send(JSON.stringify({ type: 'attach', sessionId, token, cols, rows }));
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
        if (message.type === 'output') onOutputRef.current(base64ToBytes(message.data));
        else if (message.type === 'status') onStatusRef.current?.(message.phase);
        else if (message.type === 'error') setConnectionState('error');
      };

      ws.onerror = () => {
        if (!cancelled) setConnectionState('error');
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (cancelled) return;
        setConnectionState('closed');
        scheduleReconnect();
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
  }, [enabled, sessionId]);

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

  return { connectionState, sendInput, sendResize };
}
