import type { IncomingMessage } from 'node:http';
import { Inject, Logger, Optional, type OnModuleInit } from '@nestjs/common';
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
import { JwtService, TokenInvalidError } from '../auth/jwt.service';
import { ConnectionRegistry } from '../ws/connection-registry';
import { ReliableBroadcastService } from '../ws/reliable-broadcast.service';
import { WsMetricsService } from '../ws/ws-metrics.service';
import { TaskEventBus } from './task-event-bus';

/**
 * Thin WS transport for live task-board events. A client sends a single
 * `subscribe` message and then receives every {@link TaskEvent} as it fires.
 * Board-wide (no per-task filter): the kanban renders all tasks. Mirrors the
 * workflow/terminal gateways — raw `type`-discriminated JSON on a single path
 * served by the shared Fastify server via the platform-ws adapter.
 *
 * Phase 35 D1/D2: extracts JWT from `?token=<jwt>` at handshake time, stores
 * { userId, teamId } via ConnectionRegistry. Broadcasts are scoped:
 * task events with a teamId go to that team's connections only; legacy tasks
 * (teamId = null) and system events (agent.activity) broadcast to all subscribers.
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
    @Inject(ConnectionRegistry) private readonly registry: ConnectionRegistry,
    @Inject(ReliableBroadcastService) private readonly reliable: ReliableBroadcastService,
    @Optional() private readonly jwtSvc?: JwtService,
    @Optional() @Inject(WsMetricsService) private readonly metrics?: WsMetricsService,
  ) {}

  private reportSubscribers(): void {
    this.metrics?.setSubscribers('tasks', this.subscribers.size);
  }

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

    const ctx = this.resolveUserContext(client, request);
    if (ctx === null) return; // already closed with 4001

    this.registry.register(client, ctx);
    client.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => this.onMessage(client, raw));
  }

  handleDisconnect(client: WebSocket): void {
    this.subscribers.delete(client);
    this.registry.deregister(client);
    this.reportSubscribers();
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
    if (!TaskSubscribeMessageSchema.safeParse(parsed).success) return;
    this.subscribers.add(client);
    this.reportSubscribers();
  }

  private broadcast(event: TaskBoardEvent): void {
    if (this.subscribers.size === 0) return;

    // Scoped delivery: task events with a teamId go to that team only.
    // Legacy tasks (null teamId), bulk creates, and session events (agent.activity /
    // agent.attention) are sent to all subscribers for backward compat.
    const teamId =
      (event.type === 'task.created' || event.type === 'task.updated')
        ? (event.task.teamId ?? null)
        : null;

    // Phase 56 A: ReliableBroadcastService stamps a per-channel seq + rings the
    // event before delegating the send. One ring per (channel, scope).
    if (teamId) {
      this.reliable.toTeam(`tasks:team:${teamId}`, teamId, event);
    } else {
      this.reliable.toAll('tasks:all', this.subscribers, event);
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
