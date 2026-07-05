import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import type { WebSocket } from 'ws';
import { ConnectionRegistry } from './connection-registry';
import { WsMetricsService } from './ws-metrics.service';
import { HeartbeatService } from './heartbeat.service';

const config = (maxMissedPongs: number): MidniteConfig =>
  parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {}, ws: { maxMissedPongs } });

/** A fake socket that records pings/terminate and lets the test fire 'pong'. */
function fakeSocket() {
  let pong: (() => void) | undefined;
  const ws = {
    on(event: string, cb: () => void) {
      if (event === 'pong') pong = cb;
    },
    ping: vi.fn(),
    terminate: vi.fn(),
  } as unknown as WebSocket;
  return { ws, pong: () => pong?.() };
}

function make(maxMissed = 2) {
  const registry = new ConnectionRegistry();
  const metrics = new WsMetricsService(registry);
  const svc = new HeartbeatService(registry, metrics, config(maxMissed));
  return { registry, metrics, svc };
}

afterEach(() => vi.clearAllMocks());

describe('HeartbeatService (Phase 56 C)', () => {
  it('pings live sockets and never reaps a client that keeps ponging', () => {
    const { registry, metrics, svc } = make(2);
    const { ws, pong } = fakeSocket();
    registry.register(ws, { userId: null, teamId: null });

    for (let i = 0; i < 5; i++) {
      svc.sweep();
      pong(); // client answers every round
    }

    expect(ws.ping).toHaveBeenCalled();
    expect(ws.terminate).not.toHaveBeenCalled();
    expect(metrics.snapshot().deadClientsReaped).toBe(0);
  });

  it('terminates a socket that misses too many pongs and counts the reap', () => {
    const { registry, metrics, svc } = make(2);
    const { ws } = fakeSocket(); // never pongs
    registry.register(ws, { userId: null, teamId: null });

    // sweep 1: missed 0→1, sweep 2: 1→2, sweep 3: missed>=2 → terminate.
    svc.sweep();
    svc.sweep();
    expect(ws.terminate).not.toHaveBeenCalled();
    svc.sweep();

    expect(ws.terminate).toHaveBeenCalled();
    expect(metrics.snapshot().deadClientsReaped).toBe(1);
  });

  it('a pong resets the miss counter (recovers a briefly-quiet socket)', () => {
    const { registry, svc } = make(2);
    const { ws, pong } = fakeSocket();
    registry.register(ws, { userId: null, teamId: null });

    svc.sweep(); // missed → 1
    svc.sweep(); // missed → 2
    pong(); // resets to 0
    svc.sweep(); // 0 → 1, not reaped
    svc.sweep(); // 1 → 2, not reaped

    expect(ws.terminate).not.toHaveBeenCalled();
  });
});
