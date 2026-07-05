import type { IncomingMessage } from 'node:http';
import { Inject, Logger, Optional, type OnModuleInit } from '@nestjs/common';
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
import { JwtService, TokenInvalidError } from '../auth/jwt.service';
import { ConnectionRegistry } from '../ws/connection-registry';
import { ReliableBroadcastService } from '../ws/reliable-broadcast.service';
import { WorkflowEventBus } from './workflow-event-bus';

/**
 * Thin WS transport for live workflow-run events. A client subscribes to a runId
 * and receives that run's {@link WorkflowEvent}s as they fire. Mirrors the
 * terminal gateway: raw `type`-discriminated messages on a single path served by
 * the shared Fastify server via the platform-ws adapter.
 *
 * Phase 35 D1/D2: extracts JWT from `?token=<jwt>` at handshake time, registers
 * user context in ConnectionRegistry. Events remain scoped by runId (clients only
 * receive events for runs they explicitly subscribed to), which already provides
 * implicit access control. WsBroadcastService is used for the per-run delivery.
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
    @Inject(ConnectionRegistry) private readonly registry: ConnectionRegistry,
    @Inject(ReliableBroadcastService) private readonly reliable: ReliableBroadcastService,
    @Optional() private readonly jwtSvc?: JwtService,
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

    const ctx = this.resolveUserContext(client, request);
    if (ctx === null) return; // already closed with 4001

    this.registry.register(client, ctx);
    client.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => this.onMessage(client, raw));
  }

  handleDisconnect(client: WebSocket): void {
    for (const sockets of this.byRun.values()) sockets.delete(client);
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
    const result = WorkflowSubscribeMessageSchema.safeParse(parsed);
    if (!result.success) return;
    const { runId } = result.data;
    let sockets = this.byRun.get(runId);
    if (!sockets) {
      sockets = new Set();
      this.byRun.set(runId, sockets);
    }
    sockets.add(client);
    // Phase 56 B: a workflow socket carries exactly one seq line — this run's ring.
    this.reliable.handleSubscription(client, [`workflows:run:${runId}`], result.data);
  }

  private broadcast(event: WorkflowEvent): void {
    const sockets = this.byRun.get(event.runId);
    if (!sockets) return;
    // Phase 56 A: ring is per runId; stamp seq + retain before delegating.
    this.reliable.toAll(`workflows:run:${event.runId}`, sockets, event);
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
