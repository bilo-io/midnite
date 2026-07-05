import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { ConnectionRegistry } from './connection-registry';
import { WsMetricsService } from './ws-metrics.service';
import { WsMetricsController } from './ws-metrics.controller';

const sock = () => ({}) as unknown as WebSocket;

describe('WsMetricsService (Phase 56 C)', () => {
  it('aggregates counters, per-channel subscribers, and live connections', () => {
    const registry = new ConnectionRegistry();
    const metrics = new WsMetricsService(registry);

    registry.register(sock(), { userId: null, teamId: null });
    registry.register(sock(), { userId: 'u1', teamId: 't1' });
    metrics.setSubscribers('tasks', 3);
    metrics.setSubscribers('ideas', 1);
    metrics.recordDroppedToResync();
    metrics.recordDroppedToResync();
    metrics.recordDeadClientReaped();

    const snap = metrics.snapshot();
    expect(snap.connections).toBe(2);
    expect(snap.subscribersByChannel).toEqual({ tasks: 3, ideas: 1 });
    expect(snap.droppedToResync).toBe(2);
    expect(snap.deadClientsReaped).toBe(1);
    expect(snap.ringHits).toBe(0);
    expect(snap.resyncRequired).toBe(0);
  });

  it('the controller returns the snapshot under { metrics }', () => {
    const registry = new ConnectionRegistry();
    const metrics = new WsMetricsService(registry);
    metrics.setSubscribers('workflows', 2);
    const controller = new WsMetricsController(metrics);
    expect(controller.get().metrics.subscribersByChannel).toEqual({ workflows: 2 });
  });
});
