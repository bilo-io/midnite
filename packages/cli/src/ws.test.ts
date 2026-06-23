import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openWs } from './ws.js';

// Minimal WebSocket mock — enough to exercise the helper's control flow.
class MockWebSocket {
  static lastInstance: MockWebSocket | null = null;

  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  closeCalled = false;

  constructor(public url: string) {
    MockWebSocket.lastInstance = this;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closeCalled = true;
  }

  // Helpers to fire events from tests
  open(): void {
    this.onopen?.();
  }
  message(data: string): void {
    this.onmessage?.({ data });
  }
  error(): void {
    this.onerror?.();
  }
  closeEvent(): void {
    this.onclose?.();
  }
}

beforeEach(() => {
  MockWebSocket.lastInstance = null;
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function ws(): MockWebSocket {
  return MockWebSocket.lastInstance!;
}

describe('openWs', () => {
  it('sends subscribe handshake on open', () => {
    openWs('ws://localhost:7777/ws', {
      parse: () => null,
      onMessage: () => {},
    });
    ws().open();
    expect(ws().sent).toEqual([JSON.stringify({ type: 'subscribe' })]);
  });

  it('merges extra fields into the subscribe payload', () => {
    openWs('ws://localhost:7777/ws', {
      extra: { runId: 'run-1' },
      parse: () => null,
      onMessage: () => {},
    });
    ws().open();
    expect(JSON.parse(ws().sent[0]!)).toEqual({ type: 'subscribe', runId: 'run-1' });
  });

  it('calls onReady after sending the subscribe handshake', () => {
    const onReady = vi.fn();
    openWs('ws://localhost:7777/ws', { parse: () => null, onMessage: () => {}, onReady });
    expect(onReady).not.toHaveBeenCalled();
    ws().open();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('delivers parsed messages to onMessage', () => {
    const received: number[] = [];
    openWs<number>('ws://localhost:7777/ws', {
      parse: (data) => { try { return (JSON.parse(data) as { n: number }).n; } catch { return null; } },
      onMessage: (n) => received.push(n),
    });
    ws().open();
    ws().message(JSON.stringify({ n: 1 }));
    ws().message(JSON.stringify({ n: 2 }));
    expect(received).toEqual([1, 2]);
  });

  it('silently drops frames where parse returns null', () => {
    const received: string[] = [];
    openWs<string>('ws://localhost:7777/ws', {
      parse: (data) => (data === 'keep' ? data : null),
      onMessage: (s) => received.push(s),
    });
    ws().open();
    ws().message('drop');
    ws().message('keep');
    ws().message('also-drop');
    expect(received).toEqual(['keep']);
  });

  it('calls onError on socket error', () => {
    const onError = vi.fn();
    openWs('ws://localhost:7777/ws', { parse: () => null, onMessage: () => {}, onError });
    ws().error();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('calls onError when WebSocket constructor throws', () => {
    vi.stubGlobal('WebSocket', () => { throw new Error('cannot connect'); });
    const onError = vi.fn();
    openWs('ws://bad', { parse: () => null, onMessage: () => {}, onError });
    expect(onError).toHaveBeenCalledOnce();
  });

  it('close() stops the socket and prevents reconnect', () => {
    const handle = openWs('ws://localhost:7777/ws', { parse: () => null, onMessage: () => {} });
    ws().open();
    handle.close();
    expect(ws().closeCalled).toBe(true);
    const instanceBefore = ws();
    ws().closeEvent(); // would trigger reconnect if not closed
    vi.advanceTimersByTime(5_000);
    expect(MockWebSocket.lastInstance).toBe(instanceBefore); // no new socket created
  });

  it('reconnects with backoff when reconnect is true (default)', () => {
    openWs('ws://localhost:7777/ws', { parse: () => null, onMessage: () => {} });
    const first = ws();
    first.open();
    first.closeEvent(); // unexpected close → schedule reconnect
    expect(MockWebSocket.lastInstance).toBe(first); // not reconnected yet
    vi.advanceTimersByTime(1_000);
    expect(MockWebSocket.lastInstance).not.toBe(first); // new socket
  });

  it('doubles the reconnect delay on successive failures', () => {
    openWs('ws://localhost:7777/ws', { parse: () => null, onMessage: () => {} });
    ws().open();
    ws().closeEvent();
    vi.advanceTimersByTime(1_000); // first reconnect (1 s)
    const second = ws();
    second.open();
    second.closeEvent();
    vi.advanceTimersByTime(999);
    expect(MockWebSocket.lastInstance).toBe(second); // not yet (needs 2 s)
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.lastInstance).not.toBe(second); // second reconnect (2 s)
  });

  it('resets reconnect delay to base after a successful open', () => {
    openWs('ws://localhost:7777/ws', { parse: () => null, onMessage: () => {} });
    ws().open();
    ws().closeEvent();
    vi.advanceTimersByTime(1_000);
    ws().open(); // successful reconnect — delay resets to 1 s
    ws().closeEvent();
    const instanceBefore = ws();
    vi.advanceTimersByTime(999);
    expect(MockWebSocket.lastInstance).toBe(instanceBefore);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.lastInstance).not.toBe(instanceBefore);
  });

  it('does NOT reconnect when reconnect: false', () => {
    openWs('ws://localhost:7777/ws', { reconnect: false, parse: () => null, onMessage: () => {} });
    const first = ws();
    first.open();
    first.closeEvent();
    vi.advanceTimersByTime(5_000);
    expect(MockWebSocket.lastInstance).toBe(first);
  });
});
