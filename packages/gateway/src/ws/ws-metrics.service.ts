import { Inject, Injectable } from '@nestjs/common';
import type { WsMetrics } from '@midnite/shared';
import { ConnectionRegistry } from './connection-registry';

/**
 * Phase 56 C — realtime transport health counters. Central sink the send path
 * (backpressure drops), the heartbeat (dead-client reaps), the gateways
 * (per-channel subscriber counts), and the ring (resume hits/misses — Theme B)
 * report into; read by `GET /ws/metrics`. Cheap in-memory counters, reset on
 * restart (like the ring).
 */
@Injectable()
export class WsMetricsService {
  private droppedToResync = 0;
  private deadClientsReaped = 0;
  private ringHits = 0;
  private resyncRequired = 0;
  private readonly subscribers = new Map<string, number>();

  constructor(@Inject(ConnectionRegistry) private readonly registry: ConnectionRegistry) {}

  recordDroppedToResync(): void {
    this.droppedToResync += 1;
  }

  recordDeadClientReaped(): void {
    this.deadClientsReaped += 1;
  }

  recordRingHit(): void {
    this.ringHits += 1;
  }

  recordResyncRequired(): void {
    this.resyncRequired += 1;
  }

  /** A gateway reports its current subscriber count for a channel. */
  setSubscribers(channel: string, count: number): void {
    this.subscribers.set(channel, count);
  }

  snapshot(): WsMetrics {
    return {
      connections: this.registry.size(),
      subscribersByChannel: Object.fromEntries(this.subscribers),
      droppedToResync: this.droppedToResync,
      deadClientsReaped: this.deadClientsReaped,
      ringHits: this.ringHits,
      resyncRequired: this.resyncRequired,
    };
  }
}
