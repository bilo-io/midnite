import type { IncomingMessage } from 'node:http';
import { Inject, Logger, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import {
  TASKS_WS_PATH,
  TaskSubscribeMessageSchema,
  type MidniteConfig,
  type TaskBoardEvent,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAllowedOrigin } from '../lib/allowed-origin';
import { TaskEventBus } from './task-event-bus';

/**
 * Thin WS transport for live task-board events. A client sends a single
 * `subscribe` message and then receives every {@link TaskEvent} as it fires.
 * Board-wide (no per-task filter): the kanban renders all tasks. Mirrors the
 * workflow/terminal gateways — raw `type`-discriminated JSON on a single path
 * served by the shared Fastify server via the platform-ws adapter.
 */
@WebSocketGateway({ path: TASKS_WS_PATH })
export class TasksGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(TasksGateway.name);
  private readonly subscribers = new Set<WebSocket>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TaskEventBus) private readonly bus: TaskEventBus,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe((event) => this.broadcast(event));
  }

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    const origin = request?.headers.origin;
    if (!isAllowedOrigin(origin, this.config.gateway.allowedOrigins)) {
      this.logger.warn(`rejected task WS from disallowed origin: ${origin ?? '(none)'}`);
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
    if (!TaskSubscribeMessageSchema.safeParse(parsed).success) return;
    this.subscribers.add(client);
  }

  private broadcast(event: TaskBoardEvent): void {
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
