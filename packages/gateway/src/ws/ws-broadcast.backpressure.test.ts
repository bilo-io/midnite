import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import type { WebSocket } from 'ws';
import { ConnectionRegistry } from './connection-registry';
import { WsBroadcastService, WS_BACKPRESSURE_CLOSE } from './ws-broadcast.service';
import { WsMetricsService } from './ws-metrics.service';

const config = (maxBufferedBytes: number): MidniteConfig =>
  parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {}, ws: { maxBufferedBytes } });

function fakeSocket(bufferedAmount: number) {
  return {
    readyState: 1, // OPEN
    bufferedAmount,
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

describe('WsBroadcastService — backpressure (Phase 56 C)', () => {
  it('sends to a healthy socket', () => {
    const registry = new ConnectionRegistry();
    const metrics = new WsMetricsService(registry);
    const svc = new WsBroadcastService(registry, config(1000), metrics);
    const ws = fakeSocket(0);

    svc.toAll([ws], 'hello');

    expect(ws.send).toHaveBeenCalledWith('hello');
    expect(ws.close).not.toHaveBeenCalled();
    expect(metrics.snapshot().droppedToResync).toBe(0);
  });

  it('drops a backpressured socket to resync (4014) instead of sending', () => {
    const registry = new ConnectionRegistry();
    const metrics = new WsMetricsService(registry);
    const svc = new WsBroadcastService(registry, config(1000), metrics);
    const ws = fakeSocket(2000); // buffer over the cap

    svc.toAll([ws], 'hello');

    expect(ws.send).not.toHaveBeenCalled();
    expect(ws.close).toHaveBeenCalledWith(WS_BACKPRESSURE_CLOSE, 'backpressure');
    expect(metrics.snapshot().droppedToResync).toBe(1);
  });

  it('skips non-open sockets silently', () => {
    const registry = new ConnectionRegistry();
    const svc = new WsBroadcastService(registry, config(1000));
    const ws = { readyState: 3, bufferedAmount: 0, send: vi.fn(), close: vi.fn() } as unknown as WebSocket;

    svc.toAll([ws], 'hello');

    expect(ws.send).not.toHaveBeenCalled();
    expect(ws.close).not.toHaveBeenCalled();
  });
});
