import type { IncomingMessage } from 'node:http';
import { Inject, Logger, type OnModuleInit } from '@nestjs/common';
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
import { NotificationEventBus } from './notification-event-bus';

/**
 * Thin WS transport for live notifications (the in-app feed/toasts). A client
 * sends one `subscribe` message and then receives every `notification.created`
 * event as it fires. Mirrors {@link TasksGateway}.
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
    client.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => this.onMessage(client, raw));
  }

  handleDisconnect(client: WebSocket): void {
    this.subscribers.delete(client);
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
    for (const ws of this.subscribers) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }
}

function toText(raw: Buffer | ArrayBuffer | Buffer[]): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return raw.toString('utf8');
}
