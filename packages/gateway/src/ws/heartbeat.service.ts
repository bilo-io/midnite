import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { WebSocket } from 'ws';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { ConnectionRegistry } from './connection-registry';
import { WsMetricsService } from './ws-metrics.service';

/**
 * Phase 56 C — WS heartbeat. A single interval pings every live socket; a socket
 * that misses `ws.maxMissedPongs` consecutive pongs is considered dead and
 * `terminate()`d, freeing the slot (a half-open TCP connection can otherwise
 * linger until the OS timeout). One sweep for every gateway (tasks/ideas/
 * workflows/terminal) — the registry already holds them all.
 *
 * The client needs no app-level pong: browsers auto-answer protocol pings, and
 * when the server terminates a dead socket the client's existing onclose/backoff
 * reconnect fires. (Resume-with-lastSeq on that reconnect is Theme B.)
 */
@Injectable()
export class HeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatService.name);
  private readonly missed = new WeakMap<WebSocket, number>();
  private readonly wired = new WeakSet<WebSocket>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly intervalMs: number;
  private readonly maxMissed: number;

  constructor(
    @Inject(ConnectionRegistry) private readonly registry: ConnectionRegistry,
    @Inject(WsMetricsService) private readonly metrics: WsMetricsService,
    @Inject(MIDNITE_CONFIG) config: MidniteConfig,
  ) {
    this.intervalMs = config.ws.heartbeatMs;
    this.maxMissed = config.ws.maxMissedPongs;
  }

  onModuleInit(): void {
    this.timer = setInterval(() => this.sweep(), this.intervalMs);
    // Don't keep the process alive just for the heartbeat.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One heartbeat pass — exposed for tests (drives without waiting on the timer). */
  sweep(): void {
    for (const ws of this.registry.getAll()) {
      // A pong resets the miss counter; wire the listener once per socket.
      if (!this.wired.has(ws)) {
        this.wired.add(ws);
        this.missed.set(ws, 0);
        ws.on('pong', () => this.missed.set(ws, 0));
      }

      const missed = this.missed.get(ws) ?? 0;
      if (missed >= this.maxMissed) {
        this.metrics.recordDeadClientReaped();
        this.logger.debug('terminating unresponsive WS (missed pongs)');
        try {
          ws.terminate();
        } catch {
          // already gone
        }
        continue;
      }

      this.missed.set(ws, missed + 1);
      try {
        ws.ping();
      } catch {
        // socket closing between the readyState check and the ping
      }
    }
  }
}
