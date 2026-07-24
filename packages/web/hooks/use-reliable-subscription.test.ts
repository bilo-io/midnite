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
  close(code = 1006) {
    this.onclose?.({ code });
  }
}

// A snapshot channel (no resume protocol) — the transport path we care about here.
const channel: ReliableChannel<unknown> = {
  path: '/ws/test',
  subscribe: () => null,
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
