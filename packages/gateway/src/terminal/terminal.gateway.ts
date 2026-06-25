import type { IncomingMessage } from 'node:http';
import { Inject, Logger, Optional } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import {
  ClientTerminalMessageSchema,
  TERMINAL_WS_PATH,
  type MidniteConfig,
  type ServerTerminalMessage,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAllowedOrigin } from '../lib/allowed-origin';
import { JwtService, TokenInvalidError } from '../auth/jwt.service';
import { ConnectionRegistry } from '../ws/connection-registry';
import { ApprovalService } from './approval.service';
import { TerminalService, type TerminalSubscriber } from './terminal.service';

interface ConnState {
  sessionId: string | null;
  subscriber: TerminalSubscriber;
}

/**
 * Thin WS transport for the live terminal. One PTY per connection. The protocol
 * is a flat, `type`-discriminated message (validated against the shared zod
 * union), so we read raw `message` events rather than Nest's `@SubscribeMessage`
 * event-name routing. Bound to a single path on the shared Fastify HTTP server
 * via the platform-ws `WsAdapter` (wired in main.ts).
 */
@WebSocketGateway({ path: TERMINAL_WS_PATH })
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TerminalGateway.name);
  private readonly conns = new WeakMap<WebSocket, ConnState>();

  constructor(
    @Inject(TerminalService) private readonly terminal: TerminalService,
    @Inject(ApprovalService) private readonly approvals: ApprovalService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(ConnectionRegistry) private readonly registry: ConnectionRegistry,
    @Optional() private readonly jwtSvc?: JwtService,
  ) {}

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    // `verifyClient` isn't consulted on the shared-server (noServer) upgrade path,
    // so gate the Origin here: a malicious page must not drive a PTY even though
    // it can reach loopback from the user's browser.
    const origin = request?.headers.origin;
    if (!isAllowedOrigin(origin, this.config.gateway.allowedOrigins)) {
      this.logger.warn(`rejected terminal WS from disallowed origin: ${origin ?? '(none)'}`);
      try {
        client.close(1008, 'origin not allowed');
      } catch {
        // socket may already be closing
      }
      return;
    }

    const ctx = this.resolveUserContext(client, request);
    if (ctx === null) return; // already closed with 4001

    this.registry.register(client, ctx);

    const subscriber: TerminalSubscriber = {
      send: (message: ServerTerminalMessage) => {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
      },
    };
    const state: ConnState = { sessionId: null, subscriber };
    this.conns.set(client, state);
    client.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) =>
      this.onMessage(client, state, raw),
    );
  }

  handleDisconnect(client: WebSocket): void {
    const state = this.conns.get(client);
    if (state?.sessionId) this.terminal.detach(state.sessionId, state.subscriber);
    this.conns.delete(client);
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

  private onMessage(
    client: WebSocket,
    state: ConnState,
    raw: Buffer | ArrayBuffer | Buffer[],
  ): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(toText(raw));
    } catch {
      state.subscriber.send({ type: 'error', code: 'bad-message', message: 'invalid JSON' });
      return;
    }

    const result = ClientTerminalMessageSchema.safeParse(parsed);
    if (!result.success) {
      state.subscriber.send({
        type: 'error',
        code: 'bad-message',
        message: 'unrecognized terminal message',
      });
      return;
    }
    const message = result.data;

    if (message.type === 'attach') {
      if (state.sessionId) return; // already bound to a PTY on this socket
      if (!this.terminal.verifyToken(message.sessionId, message.token)) {
        state.subscriber.send({
          type: 'error',
          code: 'unauthorized',
          message: 'invalid or expired token',
        });
        client.close();
        return;
      }
      state.sessionId = message.sessionId;
      this.terminal.attach(message.sessionId, state.subscriber, {
        cols: message.cols,
        rows: message.rows,
      });
      return;
    }

    if (!state.sessionId) {
      state.subscriber.send({
        type: 'error',
        code: 'bad-message',
        message: 'attach required before input/resize',
      });
      return;
    }

    if (message.type === 'input') {
      this.terminal.write(state.sessionId, message.data);
    } else if (message.type === 'resize') {
      this.terminal.resize(state.sessionId, message.cols, message.rows);
    } else {
      // approval-response — a viewer answered a pending tool-approval prompt.
      this.approvals.resolveByUser(state.sessionId, message.requestId, message.decision);
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
