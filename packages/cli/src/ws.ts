/** Convert a gateway HTTP(S) base URL to its ws(s):// form. */
export function gatewayWsUrl(baseUrl: string): string {
  return baseUrl.replace(/^http/, 'ws');
}

/**
 * Reusable WebSocket subscriber for the CLI.
 *
 * Handles: connect → subscribe handshake → parse/validate frames →
 * reconnect-with-backoff on unexpected close → clean teardown.
 *
 * CLI-local: the web already has its own browser-side WebSocket client
 * (`use-task-events.ts`); there is no third consumer to justify moving
 * this into `@midnite/shared`.
 */

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export interface WsHandle {
  /** Stop reconnecting and close the underlying socket. */
  close(): void;
}

export interface WsOptions<T> {
  /**
   * Merged into the subscribe handshake: `{ type: 'subscribe', ...extra }`.
   * Omit for a bare subscribe with no additional fields.
   */
  extra?: Record<string, unknown>;

  /**
   * Parse + validate a raw WS frame string.
   * Return the typed message, or `null` to silently ignore the frame.
   */
  parse: (data: string) => T | null;

  onMessage: (msg: T) => void;

  /**
   * Called once per connection after the socket opens and the subscribe
   * handshake is sent — use this to kick off a connect-time backfill fetch
   * so that any events fired between subscribe and the fetch are not lost.
   */
  onReady?: () => void;

  /**
   * Called on socket error (once per connect attempt, before any reconnect).
   * When `reconnect` is false this is the only error signal.
   */
  onError?: () => void;

  /**
   * Whether to reconnect with exponential backoff on an unexpected close.
   * Defaults to `true`. Set to `false` for one-shot connections that manage
   * their own fallback (e.g. `workflow watch` with its poll-to-end path).
   */
  reconnect?: boolean;
}

/**
 * Open a WebSocket, send the subscribe handshake, and stream typed messages
 * to `opts.onMessage`. Returns a `WsHandle` whose `close()` stops the loop.
 *
 * @example
 * const handle = openWs<TaskBoardEvent>(wsUrl + TASKS_WS_PATH, {
 *   parse: (raw) => { try { return JSON.parse(raw) as TaskBoardEvent; } catch { return null; } },
 *   onMessage: (ev) => dispatch(ev),
 * });
 * // later:
 * handle.close();
 */
export function openWs<T>(url: string, opts: WsOptions<T>): WsHandle {
  const shouldReconnect = opts.reconnect !== false;
  let closed = false;
  let socket: WebSocket | null = null;
  let reconnectDelay = RECONNECT_BASE_MS;

  function connect(): void {
    if (closed) return;
    try {
      socket = new WebSocket(url);
    } catch {
      opts.onError?.();
      return;
    }

    socket.onopen = () => {
      reconnectDelay = RECONNECT_BASE_MS;
      const payload: Record<string, unknown> = { type: 'subscribe', ...(opts.extra ?? {}) };
      socket!.send(JSON.stringify(payload));
      opts.onReady?.();
    };

    socket.onmessage = (ev: MessageEvent) => {
      const raw = typeof ev.data === 'string' ? ev.data : '';
      const msg = opts.parse(raw);
      if (msg !== null) opts.onMessage(msg);
    };

    socket.onerror = () => {
      opts.onError?.();
    };

    socket.onclose = () => {
      if (closed || !shouldReconnect) return;
      setTimeout(() => connect(), reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
    };
  }

  connect();

  return {
    close(): void {
      closed = true;
      try {
        socket?.close();
      } catch {
        // already closing — ignore
      }
    },
  };
}
