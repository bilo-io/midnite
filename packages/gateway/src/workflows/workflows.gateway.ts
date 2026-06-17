import type { IncomingMessage } from 'node:http';
import { Inject, Logger, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import {
  WORKFLOW_WS_PATH,
  WorkflowSubscribeMessageSchema,
  type MidniteConfig,
  type WorkflowEvent,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAllowedOrigin } from '../lib/allowed-origin';
import { WorkflowEventBus } from './workflow-event-bus';

/**
 * Thin WS transport for live workflow-run events. A client subscribes to a runId
 * and receives that run's {@link WorkflowEvent}s as they fire. Mirrors the
 * terminal gateway: raw `type`-discriminated messages on a single path served by
 * the shared Fastify server via the platform-ws adapter.
 */
@WebSocketGateway({ path: WORKFLOW_WS_PATH })
export class WorkflowsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(WorkflowsGateway.name);
  // runId → sockets watching it.
  private readonly byRun = new Map<string, Set<WebSocket>>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(WorkflowEventBus) private readonly bus: WorkflowEventBus,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe((event) => this.broadcast(event));
  }

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    const origin = request?.headers.origin;
    if (!isAllowedOrigin(origin, this.config.gateway.allowedOrigins)) {
      this.logger.warn(`rejected workflow WS from disallowed origin: ${origin ?? '(none)'}`);
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
    for (const sockets of this.byRun.values()) sockets.delete(client);
  }

  private onMessage(client: WebSocket, raw: Buffer | ArrayBuffer | Buffer[]): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(toText(raw));
    } catch {
      return;
    }
    const result = WorkflowSubscribeMessageSchema.safeParse(parsed);
    if (!result.success) return;
    const { runId } = result.data;
    let sockets = this.byRun.get(runId);
    if (!sockets) {
      sockets = new Set();
      this.byRun.set(runId, sockets);
    }
    sockets.add(client);
  }

  private broadcast(event: WorkflowEvent): void {
    const sockets = this.byRun.get(event.runId);
    if (!sockets) return;
    const payload = JSON.stringify(event);
    for (const ws of sockets) {
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
