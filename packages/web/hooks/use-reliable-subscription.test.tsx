import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  gatewayWsUrl: () => 'ws://gw',
  getAccessToken: () => 'tok',
}));

import { useReliableSubscription, type ReliableChannel } from './use-reliable-subscription';

// A controllable WebSocket stub installed as the global for the hook to construct.
class FakeWS {
  static instances: FakeWS[] = [];
  static OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    FakeWS.instances.push(this);
  }
  send(d: string) {
    this.sent.push(d);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  message(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

type Ev = { type: string; n?: number };
const channel: ReliableChannel<Ev> = {
  path: '/ws/test',
  subscribe: () => ({ type: 'subscribe' }),
  decode: (raw) => {
    const p = JSON.parse(raw) as { seq?: number; event?: Ev };
    return p.event ? { seq: p.seq, event: p.event } : null;
  },
};

beforeEach(() => {
  FakeWS.instances = [];
  vi.stubGlobal('WebSocket', FakeWS as unknown as typeof WebSocket);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useReliableSubscription (Phase 56 D)', () => {
  it('connects, sends the subscribe message on open, and includes the token', () => {
    renderHook(() => useReliableSubscription(channel, { onEvent: vi.fn() }));
    const ws = FakeWS.instances[0]!;
    expect(ws.url).toBe('ws://gw/ws/test?token=tok');
    act(() => ws.open());
    expect(ws.sent).toContain(JSON.stringify({ type: 'subscribe' }));
  });

  it('decodes frames and forwards the inner event', () => {
    const onEvent = vi.fn();
    renderHook(() => useReliableSubscription(channel, { onEvent }));
    const ws = FakeWS.instances[0]!;
    act(() => ws.open());
    act(() => ws.message({ seq: 1, event: { type: 'ping', n: 7 } }));
    expect(onEvent).toHaveBeenCalledWith({ type: 'ping', n: 7 });
  });

  it('exposes send for channels that talk back', () => {
    const { result } = renderHook(() => useReliableSubscription(channel, { onEvent: vi.fn() }));
    const ws = FakeWS.instances[0]!;
    act(() => ws.open());
    act(() => result.current.send({ type: 'decide' }));
    expect(ws.sent).toContain(JSON.stringify({ type: 'decide' }));
  });

  it('does not connect when disabled', () => {
    renderHook(() => useReliableSubscription(channel, { onEvent: vi.fn() }, false));
    expect(FakeWS.instances).toHaveLength(0);
  });

  it('calls onOpen with a send fn', () => {
    const onOpen = vi.fn();
    renderHook(() => useReliableSubscription(channel, { onEvent: vi.fn(), onOpen }));
    act(() => FakeWS.instances[0]!.open());
    expect(onOpen).toHaveBeenCalledWith(expect.any(Function));
  });
});
