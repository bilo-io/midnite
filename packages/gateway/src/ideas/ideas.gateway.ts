import type { IncomingMessage } from 'node:http';
import { Inject, Logger, Optional, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import {
  IDEAS_WS_PATH,
  IdeaSubscribeMessageSchema,
  type IdeaEvent,
  type MidniteConfig,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAllowedOrigin } from '../lib/allowed-origin';
import { JwtService, TokenInvalidError } from '../auth/jwt.service';
import { ConnectionRegistry } from '../ws/connection-registry';
import { ReliableBroadcastService } from '../ws/reliable-broadcast.service';
import { WsMetricsService } from '../ws/ws-metrics.service';
import { IdeaEventBus } from './idea-event-bus';

@WebSocketGateway({ path: IDEAS_WS_PATH })
export class IdeasGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(IdeasGateway.name);
  private readonly subscribers = new Set<WebSocket>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(IdeaEventBus) private readonly bus: IdeaEventBus,
    @Inject(ConnectionRegistry) private readonly registry: ConnectionRegistry,
    @Inject(ReliableBroadcastService) private readonly reliable: ReliableBroadcastService,
    @Optional() private readonly jwtSvc?: JwtService,
    @Optional() @Inject(WsMetricsService) private readonly metrics?: WsMetricsService,
  ) {}

  private reportSubscribers(): void {
    this.metrics?.setSubscribers('ideas', this.subscribers.size);
  }

  onModuleInit(): void {
    this.bus.subscribe((event) => this.broadcast(event));
  }

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    const origin = request?.headers.origin;
    if (!isAllowedOrigin(origin, this.config.gateway.allowedOrigins)) {
      this.logger.warn(`rejected ideas WS from disallowed origin: ${origin ?? '(none)'}`);
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
          try { client.close(4001, 'invalid or expired token'); } catch { /* closing */ }
          return;
        }
        throw err;
      }
    } else {
      this.registry.register(client, { userId: null, teamId: null });
    }

    client.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      let parsed: unknown;
      try { parsed = JSON.parse(toText(raw)); } catch { return; }
      const result = IdeaSubscribeMessageSchema.safeParse(parsed);
      if (!result.success) return;
      this.subscribers.add(client);
      // Phase 56 B: same two-line shape as tasks — the all line + the client's team line.
      const teamId = this.registry.getContext(client)?.teamId ?? null;
      const allowedKeys = ['ideas:all', ...(teamId ? [`ideas:team:${teamId}`] : [])];
      this.reliable.handleSubscription(client, allowedKeys, result.data);
      this.reportSubscribers();
    });
  }

  handleDisconnect(client: WebSocket): void {
    this.subscribers.delete(client);
    this.registry.deregister(client);
    this.reportSubscribers();
  }

  private broadcast(event: IdeaEvent): void {
    if (this.subscribers.size === 0) return;
    const teamId =
      (event.type === 'idea.created' || event.type === 'idea.updated')
        ? (event.idea.teamId ?? null)
        : null;
    // Phase 56 A: stamp seq + ring before delegating the send.
    if (teamId) {
      this.reliable.toTeam(`ideas:team:${teamId}`, teamId, event);
    } else {
      this.reliable.toAll('ideas:all', this.subscribers, event);
    }
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
