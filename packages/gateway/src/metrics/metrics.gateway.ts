import type { IncomingMessage } from 'node:http';
import { Inject, Logger, Optional, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import {
  METRICS_WS_PATH,
  MetricsSubscribeMessageSchema,
  type MetricsEvent,
  type MidniteConfig,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAllowedOrigin } from '../lib/allowed-origin';
import { JwtService, TokenInvalidError } from '../auth/jwt.service';
import { ConnectionRegistry } from '../ws/connection-registry';
import { ReliableBroadcastService } from '../ws/reliable-broadcast.service';
import { WsMetricsService } from '../ws/ws-metrics.service';
import { MetricsEventBus } from './metrics-event-bus';

// A single ring line — fleet gauges aren't team-scoped, so every subscriber sees
// the same `metrics:all` stream (seq + ring + resume from Phase 56).
const METRICS_RING_KEY = 'metrics:all';

/**
 * Phase 61 F — the live metrics WebSocket. Rides the Phase 56 reliable-broadcast
 * envelope (seq + ring + resume) exactly like the board channels, so the Ops page
 * subscribes with the shared client hook and survives reconnects. The gateway
 * subscribes to {@link MetricsEventBus} (fed by `MetricsService` on every gauge
 * change) and fans out to connected clients; when nothing is connected it's a
 * no-op, and the client keeps a slow poll as its fallback.
 */
@WebSocketGateway({ path: METRICS_WS_PATH })
export class MetricsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(MetricsGateway.name);
  private readonly subscribers = new Set<WebSocket>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(MetricsEventBus) private readonly bus: MetricsEventBus,
    @Inject(ConnectionRegistry) private readonly registry: ConnectionRegistry,
    @Inject(ReliableBroadcastService) private readonly reliable: ReliableBroadcastService,
    @Optional() private readonly jwtSvc?: JwtService,
    @Optional() @Inject(WsMetricsService) private readonly metrics?: WsMetricsService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe((event) => this.broadcast(event));
  }

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    const origin = request?.headers.origin;
    if (!isAllowedOrigin(origin, this.config.gateway.allowedOrigins)) {
      this.logger.warn(`rejected metrics WS from disallowed origin: ${origin ?? '(none)'}`);
      try {
        client.close(1008, 'origin not allowed');
      } catch {
        // already closing
      }
      return;
    }

    const token = extractQueryToken(request?.url);
    if (token && this.jwtSvc?.enabled) {
      try {
        const payload = this.jwtSvc.verifyAccessToken(token);
        this.registry.register(client, { userId: payload.sub, teamId: payload.teamId ?? null });
      } catch (err) {
        if (err instanceof TokenInvalidError) {
          try {
            client.close(4001, 'invalid or expired token');
          } catch {
            // closing
          }
          return;
        }
        throw err;
      }
    } else {
      this.registry.register(client, { userId: null, teamId: null });
    }

    client.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(toText(raw));
      } catch {
        return;
      }
      const result = MetricsSubscribeMessageSchema.safeParse(parsed);
      if (!result.success) return;
      this.subscribers.add(client);
      this.reliable.handleSubscription(client, [METRICS_RING_KEY], result.data);
      this.reportSubscribers();
    });
  }

  handleDisconnect(client: WebSocket): void {
    this.subscribers.delete(client);
    this.registry.deregister(client);
    this.reportSubscribers();
  }

  private broadcast(event: MetricsEvent): void {
    if (this.subscribers.size === 0) return;
    this.reliable.toAll(METRICS_RING_KEY, this.subscribers, event);
  }

  private reportSubscribers(): void {
    this.metrics?.setSubscribers('metrics', this.subscribers.size);
  }
}

function extractQueryToken(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url, 'ws://localhost').searchParams.get('token');
  } catch {
    return null;
  }
}

function toText(raw: Buffer | ArrayBuffer | Buffer[]): string {
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return Buffer.concat(raw as Buffer[]).toString('utf8');
}
