import type { IncomingMessage } from 'node:http';
import { Inject, Logger, Optional, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import {
  NOTIFICATIONS_WS_PATH,
  NotificationSubscribeMessageSchema,
  type MidniteConfig,
  type NotificationEvent,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAllowedOrigin } from '../lib/allowed-origin';
import { JwtService, TokenInvalidError } from '../auth/jwt.service';
import { ConnectionRegistry } from '../ws/connection-registry';
import { WsBroadcastService } from '../ws/ws-broadcast.service';
import { NotificationEventBus } from './notification-event-bus';

/**
 * Thin WS transport for live notifications (the in-app feed/toasts). A client
 * sends one `subscribe` message and then receives every `notification.created`
 * event it is entitled to see.
 *
 * Phase 35 D/E: extracts JWT from `?token=<jwt>` at handshake time, registers
 * user context in ConnectionRegistry. Events are scoped by notification.teamId:
 * team-scoped notifications go to that team only; system/legacy (null teamId)
 * broadcast to all subscribers (backward compat).
 */
@WebSocketGateway({ path: NOTIFICATIONS_WS_PATH })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly subscribers = new Set<WebSocket>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(NotificationEventBus) private readonly bus: NotificationEventBus,
    @Inject(ConnectionRegistry) private readonly registry: ConnectionRegistry,
    @Inject(WsBroadcastService) private readonly wsBroadcast: WsBroadcastService,
    @Optional() private readonly jwtSvc?: JwtService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe((event) => this.broadcast(event));
  }

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    const origin = request?.headers.origin;
    if (!isAllowedOrigin(origin, this.config.gateway.allowedOrigins)) {
      this.logger.warn(`rejected notification WS from disallowed origin: ${origin ?? '(none)'}`);
      try {
        client.close(1008, 'origin not allowed');
      } catch {
        // already closing
      }
      return;
    }

    const ctx = this.resolveUserContext(client, request);
    if (ctx === null) return; // already closed with 4001

    this.registry.register(client, ctx);
    client.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => this.onMessage(client, raw));
  }

  handleDisconnect(client: WebSocket): void {
    this.subscribers.delete(client);
    this.registry.deregister(client);
  }

  private resolveUserContext(
    client: WebSocket,
    request?: IncomingMessage,
  ): { userId: string | null; teamId: string | null } | null {
    const token = extractQueryToken(request?.url);
    if (!token || !this.jwtSvc?.enabled) {
      return { userId: null, teamId: null };
    }
    try {
      const payload = this.jwtSvc.verifyAccessToken(token);
      return { userId: payload.sub, teamId: payload.teamId ?? null };
    } catch (err) {
      if (err instanceof TokenInvalidError) {
        try { client.close(4001, 'invalid or expired token'); } catch { /* closing */ }
        return null;
      }
      throw err;
    }
  }

  private onMessage(client: WebSocket, raw: Buffer | ArrayBuffer | Buffer[]): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(toText(raw));
    } catch {
      return;
    }
    if (!NotificationSubscribeMessageSchema.safeParse(parsed).success) return;
    this.subscribers.add(client);
  }

  private broadcast(event: NotificationEvent): void {
    if (this.subscribers.size === 0) return;
    const payload = JSON.stringify(event);
    const teamId =
      event.type === 'notification.created' ? (event.notification.teamId ?? null) : null;
    if (teamId) {
      this.wsBroadcast.toTeam(teamId, payload);
    } else {
      this.wsBroadcast.toAll(this.subscribers, payload);
    }
  }
}

function extractQueryToken(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const params = new URL(url, 'ws://localhost').searchParams;
    return params.get('token');
  } catch {
    return null;
  }
}

function toText(raw: Buffer | ArrayBuffer | Buffer[]): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return raw.toString('utf8');
}
