import { Inject, Injectable, Optional } from '@nestjs/common';
import { WebSocket } from 'ws';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { ConnectionRegistry } from './connection-registry';
import { WsMetricsService } from './ws-metrics.service';

/** Backpressure close code (Phase 56 C) — the client reconnects + resyncs. */
export const WS_BACKPRESSURE_CLOSE = 4014;

/**
 * Scoped WS broadcast helpers (Phase 35 D2).
 *
 * - toTeam: send to all sockets belonging to a teamId (team-scoped entities).
 * - toUser: send to all sockets for a specific userId.
 * - toAll: broadcast to every connected socket (retained for system events,
 *          pool counts, and legacy tasks whose teamId is null).
 *
 * Sockets that are CLOSING or CLOSED are skipped silently.
 *
 * Phase 56 C — per-client backpressure: if a socket's outbound buffer exceeds
 * `ws.maxBufferedBytes` (a slow/stalled consumer), it's **dropped-to-resync** —
 * closed with {@link WS_BACKPRESSURE_CLOSE} so it reconnects and full-resyncs,
 * rather than blocking the broadcast or buffering without bound.
 */
@Injectable()
export class WsBroadcastService {
  private readonly maxBufferedBytes: number;

  constructor(
    private readonly registry: ConnectionRegistry,
    @Optional() @Inject(MIDNITE_CONFIG) config?: MidniteConfig,
    @Optional() @Inject(WsMetricsService) private readonly metrics?: WsMetricsService,
  ) {
    this.maxBufferedBytes = config?.ws.maxBufferedBytes ?? 1_048_576;
  }

  toTeam(teamId: string, payload: string): void {
    for (const ws of this.registry.getByTeam(teamId)) {
      this.trySend(ws, payload);
    }
  }

  toUser(userId: string, payload: string): void {
    for (const ws of this.registry.getByUser(userId)) {
      this.trySend(ws, payload);
    }
  }

  toAll(sockets: Iterable<WebSocket>, payload: string): void {
    for (const ws of sockets) {
      this.trySend(ws, payload);
    }
  }

  private trySend(ws: WebSocket, payload: string): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    // Slow consumer: its buffer is backing up — drop it to resync instead of
    // piling on more frames (which would delay every other client's delivery).
    if (ws.bufferedAmount > this.maxBufferedBytes) {
      this.metrics?.recordDroppedToResync();
      try {
        ws.close(WS_BACKPRESSURE_CLOSE, 'backpressure');
      } catch {
        // already closing
      }
      return;
    }
    ws.send(payload);
  }
}
