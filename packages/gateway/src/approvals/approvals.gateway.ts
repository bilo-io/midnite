import type { IncomingMessage } from 'node:http';
import { Inject, Logger, OnModuleInit, Optional } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import {
  APPROVALS_WS_PATH,
  InboxResolveMessageSchema,
  type ApprovalsWsEvent,
  type MidniteConfig,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAllowedOrigin } from '../lib/allowed-origin';
import { ApprovalEventBus } from '../terminal/approval-event-bus';
import { ApprovalService } from '../terminal/approval.service';

function toText(raw: Buffer | ArrayBuffer | Buffer[]): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return raw.toString('utf8');
}

/**
 * Cross-session approvals inbox WS gateway. On connect, replays the full pending
 * snapshot; thereafter pushes live `approval.requested` / `approval.resolved` events.
 * Clients may send `inbox.resolve` to answer a pending approval from any session.
 */
@WebSocketGateway({ path: APPROVALS_WS_PATH })
export class ApprovalsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(ApprovalsGateway.name);
  private readonly subscribers = new Set<WebSocket>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Optional() @Inject(ApprovalEventBus) private readonly bus?: ApprovalEventBus,
    @Optional() @Inject(ApprovalService) private readonly approvalService?: ApprovalService,
  ) {}

  onModuleInit(): void {
    this.bus?.subscribe((event) => this.broadcast(event));
  }

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    const origin = request?.headers.origin;
    if (!isAllowedOrigin(origin, this.config.gateway.allowedOrigins)) {
      this.logger.warn(`rejected approvals WS from disallowed origin: ${origin ?? '(none)'}`);
      try {
        client.close(1008, 'origin not allowed');
      } catch {
        // socket may already be closing
      }
      return;
    }

    this.subscribers.add(client);

    // Replay the full pending snapshot on connect so the inbox is immediately populated.
    const pending = this.approvalService?.listPending() ?? [];
    for (const approval of pending) {
      this.send(client, { type: 'approval.requested', approval });
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

    const result = InboxResolveMessageSchema.safeParse(parsed);
    if (!result.success) return;

    const msg = result.data;
    this.approvalService?.resolveByUser(msg.sessionId, msg.requestId, msg.decision);
  }

  private broadcast(event: ApprovalsWsEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.subscribers) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  private send(client: WebSocket, event: ApprovalsWsEvent): void {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(event));
  }
}
