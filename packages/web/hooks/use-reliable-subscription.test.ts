import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useReliableSubscription, type ReliableChannel } from './use-reliable-subscription';

const refreshAccessToken = vi.fn();
vi.mock('@/lib/api', () => ({
  gatewayWsUrl: () => 'ws://localhost:9999',
  getAccessToken: () => 'tok',
  refreshAccessToken: (...args: unknown[]) => refreshAccessToken(...args),
}));

/** A controllable WebSocket stub — the hook constructs one; we drive its lifecycle. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  sent: string[] = [];
  readyState = 1; // OPEN
  static OPEN = 1;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  /**
   * When true, `close()` records the intent but does NOT fire `onclose` — the
   * shape of a socket closed while still CONNECTING, whose `close` event lands
   * a tick later. The stale-socket regression below depends on that ordering.
   */
  deferClose = false;
  closed = false;
  close(code = 1006) {
    this.closed = true;
    if (!this.deferClose) this.onclose?.({ code });
  }
}

// A snapshot channel (no resume protocol) — the transport path we care about here.
const channel: ReliableChannel<unknown> = {
  path: '/ws/test',
  subscribe: () => null,
  decode: (raw) => ({ event: JSON.parse(raw) as unknown }),
};

// A resumable channel (the shape `/ws/tasks` uses): a non-null `subscribe()`
// means the hook must send a handshake frame on open, which is what the
// stale-socket test below asserts never gets lost.
const resumableChannel: ReliableChannel<unknown> = {
  path: '/ws/resumable',
  subscribe: () => ({ type: 'subscribe' }),
  decode: (raw) => ({ event: JSON.parse(raw) as unknown }),
};

describe('useReliableSubscription — token refresh on auth close', () => {
  beforeEach(() => {
    refreshAccessToken.mockReset();
    refreshAccessToken.mockResolvedValue('fresh-token');
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
  });
  afterEach(() => vi.unstubAllGlobals());

  async function open() {
    renderHook(() => useReliableSubscription(channel, { onEvent: vi.fn() }));
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(1));
    const sock = FakeWebSocket.instances[0]!;
    act(() => sock.onopen?.());
    return sock;
  }

  it('refreshes the token before reconnecting after a 4001 (expired-token) close', async () => {
    const sock = await open();
    act(() => sock.close(4001));
    await waitFor(() => expect(refreshAccessToken).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(2), { timeout: 2000 });
  });

  it('does not refresh the token on a normal (non-auth) close', async () => {
    const sock = await open();
    act(() => sock.close(1006));
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(2), { timeout: 2000 });
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});

/**
 * Regression: a *previous* socket's late `close` must not orphan the live one.
 *
 * `wsRef` is shared across effect runs. React's dev-mode double-invoke (and any
 * remount, or an `enabled` toggle) closes the first socket while it is still
 * CONNECTING, so its `close` event lands *after* the second run has stored its
 * own socket in that ref. An unguarded `wsRef.current = null` in `onclose`
 * therefore disowned a perfectly healthy socket, and the handshake frame it
 * sends on open went nowhere — the gateway never registered the client, so the
 * board silently received no events for the life of the page. It cost four e2e
 * failures and read as four unrelated bugs.
 */
describe('useReliableSubscription — a stale socket must not orphan the live one', () => {
  beforeEach(() => {
    refreshAccessToken.mockReset();
    refreshAccessToken.mockResolvedValue('fresh-token');
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
  });
  afterEach(() => vi.unstubAllGlobals());

  /**
   * Re-run the effect on ONE hook instance (so `wsRef` is shared, as it is under
   * the double-invoke) and hold back the first socket's `close` event until the
   * replacement is in place.
   */
  async function supersedeSocket() {
    const { rerender, result } = renderHook(
      ({ enabled }) => useReliableSubscription(resumableChannel, { onEvent: vi.fn() }, enabled),
      { initialProps: { enabled: true } },
    );
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(1));
    const first = FakeWebSocket.instances[0]!;
    first.deferClose = true; // still CONNECTING — `onclose` comes later

    act(() => rerender({ enabled: false })); // cleanup closes `first`
    act(() => rerender({ enabled: true })); // …and a replacement is created
    await waitFor(() => expect(FakeWebSocket.instances.length).toBe(2));
    const second = FakeWebSocket.instances[1]!;

    // The superseded socket's close finally lands, after the live one was stored.
    act(() => first.onclose?.({ code: 1006 }));
    return { first, second, result };
  }

  it('still sends the handshake on the live socket', async () => {
    const { second } = await supersedeSocket();
    act(() => second.onopen?.());
    expect(second.sent.map((raw) => JSON.parse(raw) as { type: string })).toEqual([
      { type: 'subscribe' },
    ]);
  });

  it('leaves the live socket reachable through the returned send()', async () => {
    const { second, result } = await supersedeSocket();
    act(() => second.onopen?.());
    act(() => result.current.send({ type: 'ping' }));
    expect(second.sent).toContain(JSON.stringify({ type: 'ping' }));
  });
});
