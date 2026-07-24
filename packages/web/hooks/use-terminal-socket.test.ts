import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useTerminalSocket } from './use-terminal-socket';

const mintTerminalToken = vi.fn();
const refreshAccessToken = vi.fn();
// A stand-in for the real ApiError so the hook's `err instanceof ApiError` (which
// gates the refresh-on-401 retry) works against the mocked module.
const { ApiError } = vi.hoisted(() => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));
vi.mock('@/lib/api', () => ({
  mintTerminalToken: (...args: unknown[]) => mintTerminalToken(...args),
  gatewayWsUrl: () => 'ws://localhost:9999',
  getAccessToken: () => null,
  refreshAccessToken: (...args: unknown[]) => refreshAccessToken(...args),
  ApiError,
}));

/** A controllable WebSocket stub — the hook constructs one; we drive its lifecycle. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  sent: string[] = [];
  binaryType = 'blob';
  readyState = 1; // OPEN
  static OPEN = 1;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code = 1006) {
    this.onclose?.({ code });
  }
  emit(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
  sentTypes(): string[] {
    return this.sent.map((s) => (JSON.parse(s) as { type: string }).type);
  }
  lastSent(): Record<string, unknown> {
    return JSON.parse(this.sent[this.sent.length - 1]!) as Record<string, unknown>;
  }
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const output = (seq: number, text: string) => ({ type: 'output', seq, ts: 1, data: b64(text) });

describe('useTerminalSocket (Phase 56 F)', () => {
  beforeEach(() => {
    mintTerminalToken.mockReset();
    mintTerminalToken.mockResolvedValue({ token: 'tok' });
    refreshAccessToken.mockReset();
    refreshAccessToken.mockResolvedValue('fresh-token');
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Render, mint the token (async), and open the first socket. */
  async function connect(overrides: Record<string, unknown> = {}) {
    const onOutput = vi.fn();
    const onResync = vi.fn();
    const view = renderHook(() =>
      useTerminalSocket({ attachId: 's1', enabled: true, onOutput, onResync, ...overrides }),
    );
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(1));
    const sock = FakeWebSocket.instances[0]!;
    await act(async () => sock.onopen?.());
    return { view, sock, onOutput, onResync };
  }

  it('attaches fresh, then unwraps a sequenced (seq+ts) output frame', async () => {
    const { sock, onOutput } = await connect();
    // A fresh connection attaches (no lastSeq).
    expect(sock.sentTypes()).toContain('attach');
    expect(sock.lastSent().type).toBe('attach');

    act(() => sock.emit(output(0, 'hello')));
    expect(onOutput).toHaveBeenCalledTimes(1);
    expect(new TextDecoder().decode(onOutput.mock.calls[0]![0])).toBe('hello');
  });

  it('on resync-required, clears (onResync) and drops lastSeq so a fresh frame renders', async () => {
    const { sock, onOutput, onResync } = await connect();
    act(() => sock.emit(output(4, 'stale-tail'))); // lastSeq = 4
    expect(onOutput).toHaveBeenCalledTimes(1);

    act(() => sock.emit({ type: 'resync-required', reason: 'ring-overflow', fromSeq: 4 }));
    expect(onResync).toHaveBeenCalledTimes(1);

    // lastSeq reset to -1 → the fresh ring replay (which restarts low) renders again.
    act(() => sock.emit(output(0, 'fresh-ring')));
    expect(onOutput).toHaveBeenCalledTimes(2);
    expect(new TextDecoder().decode(onOutput.mock.calls[1]![0])).toBe('fresh-ring');
  });

  it('resumes with lastSeq on reconnect', async () => {
    const { sock, onOutput } = await connect();
    act(() => sock.emit(output(7, 'seen'))); // lastSeq = 7
    expect(onOutput).toHaveBeenCalledTimes(1);

    // Drop the socket → the hook schedules a reconnect (capped backoff).
    act(() => sock.close());
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(2), { timeout: 2000 });
    const sock2 = FakeWebSocket.instances[1]!;
    await act(async () => sock2.onopen?.());

    // The reconnect resumes from the last rendered seq, not a fresh attach.
    const msg = sock2.lastSent();
    expect(msg.type).toBe('resume');
    expect(msg.lastSeq).toBe(7);
  });

  it('refreshes the token before reconnecting after a 4001 (expired-token) close', async () => {
    const { sock } = await connect();
    // The gateway rejects an expired access token by closing with 4001. Reconnecting
    // with the same token would loop forever — the hook must refresh first.
    act(() => sock.close(4001));
    await waitFor(() => expect(refreshAccessToken).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(2), { timeout: 2000 });
  });

  it('does not refresh the token on a normal (non-auth) close', async () => {
    const { sock } = await connect();
    act(() => sock.close(1006)); // abnormal transport close, not an auth failure
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(2), { timeout: 2000 });
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes the token before retrying when the token mint 401s', async () => {
    mintTerminalToken.mockReset();
    mintTerminalToken.mockRejectedValueOnce(new ApiError('unauthorized', 401));
    mintTerminalToken.mockResolvedValue({ token: 'tok' });
    const onOutput = vi.fn();
    renderHook(() => useTerminalSocket({ attachId: 's1', enabled: true, onOutput }));
    // First mint 401s → refresh, then the retried mint succeeds and the socket opens.
    await waitFor(() => expect(refreshAccessToken).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(1), { timeout: 2000 });
  });
});
