import type { IncomingMessage } from 'node:http';
import { Inject, Logger, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { APPROVALS_WS_PATH, InboxResolveMessageSchema, type MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAllowedOrigin } from '../lib/allowed-origin';
import { ApprovalEventBus } from '../terminal/approval-event-bus';
import { ApprovalService } from '../terminal/approval.service';

/**
 * WebSocket gateway for the global approvals inbox.
 *
 * On connect: sends the current pending approvals snapshot so the client
 * doesn't miss approvals that arrived before it connected.
 * On event from ApprovalEventBus: fans out to all subscribers.
 * On `inbox.resolve` from the client: forwards to ApprovalService.resolveByUser().
 */
@WebSocketGateway({ path: APPROVALS_WS_PATH })
export class ApprovalsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(ApprovalsGateway.name);
  private readonly subscribers = new Set<WebSocket>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(ApprovalEventBus) private readonly bus: ApprovalEventBus,
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe((event) => this.broadcast(event));
  }

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    const origin = request?.headers.origin;
    if (!isAllowedOrigin(origin, this.config.gateway.allowedOrigins)) {
      this.logger.warn(`rejected approvals WS from disallowed origin: ${origin ?? '(none)'}`);
      try {
        client.close(1008, 'origin not allowed');
      } catch {
        // already closing
      }
      return;
    }
    this.subscribers.add(client);
    client.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => this.onMessage(client, raw));

    // Replay pending snapshot so new clients don't miss in-flight approvals.
    const pending = this.approvalService.listPending();
    for (const approval of pending) {
      this.send(client, { type: 'approval.requested', approval });
    }
  }

  handleDisconnect(client: WebSocket): void {
    this.subscribers.delete(client);
  }

  private onMessage(client: WebSocket, raw: Buffer | ArrayBuffer | Buffer[]): void {
    let data: unknown;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const parsed = InboxResolveMessageSchema.safeParse(data);
    if (!parsed.success) return;
    const { requestId, sessionId, decision } = parsed.data;
    this.approvalService.resolveByUser(sessionId, requestId, decision);
    void client; // suppress unused-var lint
  }

  private broadcast(event: object): void {
    const payload = JSON.stringify(event);
    for (const client of this.subscribers) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  private send(client: WebSocket, event: object): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  }
}
