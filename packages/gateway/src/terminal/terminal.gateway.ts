import { Inject, Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import {
  ClientTerminalMessageSchema,
  TERMINAL_WS_PATH,
  type ServerTerminalMessage,
} from '@midnite/shared';
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

  constructor(@Inject(TerminalService) private readonly terminal: TerminalService) {}

  handleConnection(client: WebSocket): void {
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
    } else {
      this.terminal.resize(state.sessionId, message.cols, message.rows);
    }
  }
}

function toText(raw: Buffer | ArrayBuffer | Buffer[]): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return raw.toString('utf8');
}
