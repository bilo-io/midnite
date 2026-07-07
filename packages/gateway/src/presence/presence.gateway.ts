import type { IncomingMessage } from 'node:http';
import { Inject, Logger, Optional, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { WebSocket } from 'ws';
import { ClientPresenceMessageSchema, PRESENCE_WS_PATH, type MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAllowedOrigin } from '../lib/allowed-origin';
import { JwtService, TokenInvalidError } from '../auth/jwt.service';
import { ConnectionRegistry } from '../ws/connection-registry';
import { PresenceService, type PresenceIdentity } from './presence.service';

/**
 * Phase 64 Theme A — the presence WS transport (`/ws/presence`). Thin, mirroring
 * [`tasks.gateway.ts`](../tasks/tasks.gateway.ts): origin check + JWT handshake
 * resolution at connect, then parse each client frame and hand it to
 * {@link PresenceService}. Identity is resolved once at connect and cached per
 * socket; the first `presence.hello` frame joins the peer.
 *
 * The socket is registered with the shared `ConnectionRegistry` purely so the WS
 * heartbeat sweep reaps it if it goes dead — presence fan-out uses the service's
 * own scoped socket set, not the registry.
 */
@WebSocketGateway({ path: PRESENCE_WS_PATH })
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly logger = new Logger(PresenceGateway.name);
  private readonly identities = new WeakMap<WebSocket, PresenceIdentity>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(ConnectionRegistry) private readonly registry: ConnectionRegistry,
    @Inject(PresenceService) private readonly presence: PresenceService,
    @Optional() private readonly jwtSvc?: JwtService,
  ) {}

  onModuleInit(): void {
    this.presence.start();
  }

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    const origin = request?.headers.origin;
    if (!isAllowedOrigin(origin, this.config.gateway.allowedOrigins)) {
      this.logger.warn(`rejected presence WS from disallowed origin: ${origin ?? '(none)'}`);
      try { client.close(1008, 'origin not allowed'); } catch { /* closing */ }
      return;
    }

    const identity = this.resolveIdentity(client, request);
    if (identity === null) return; // already closed with 4001

    this.identities.set(client, identity);
    this.registry.register(client, { userId: identity.userId, teamId: identity.teamId });
    client.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => this.onMessage(client, raw));
  }

  handleDisconnect(client: WebSocket): void {
    this.presence.leave(client);
    this.registry.deregister(client);
  }

  private resolveIdentity(client: WebSocket, request?: IncomingMessage): PresenceIdentity | null {
    const token = extractQueryToken(request?.url);
    if (!token || !this.jwtSvc?.enabled) {
      return { userId: null, teamId: null, verifiedName: null };
    }
    try {
      const payload = this.jwtSvc.verifyAccessToken(token);
      return { userId: payload.sub, teamId: payload.teamId ?? null, verifiedName: payload.email };
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
    const result = ClientPresenceMessageSchema.safeParse(parsed);
    if (!result.success) return;
    const frame = result.data;
    if (frame.type === 'presence.hello') {
      const identity = this.identities.get(client);
      if (identity) this.presence.join(client, identity, frame);
      return;
    }
    this.presence.handleMessage(client, frame);
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
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return raw.toString('utf8');
}
