import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { parseConfig, type MidniteConfig, type ServerTerminalMessage } from '@midnite/shared';
import type { TasksService } from '../tasks/tasks.service';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';

// Drives the real gateway + real PTY service through a stand-in socket. The
// WsAdapter/Fastify upgrade plumbing is covered by the end-to-end run; here we
// pin the message protocol: zod validation, token auth, and message dispatch.

const noTasks = { listTasks: () => [] } as unknown as TasksService;

function makeConfig(terminal: Record<string, unknown>): MidniteConfig {
  return parseConfig({ agent: {}, terminal, knowledge: {}, gateway: {} });
}

function b64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

class FakeSocket {
  readyState: number = WebSocket.OPEN;
  closed = false;
  readonly received: ServerTerminalMessage[] = [];
  private messageHandler: ((raw: Buffer) => void) | null = null;
  private readonly waiters: Array<{
    pred: (m: ServerTerminalMessage) => boolean;
    resolve: (m: ServerTerminalMessage) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  on(event: string, cb: (raw: Buffer) => void): void {
    if (event === 'message') this.messageHandler = cb;
  }

  send(data: string): void {
    const message = JSON.parse(data) as ServerTerminalMessage;
    this.received.push(message);
    for (const w of [...this.waiters]) {
      if (w.pred(message)) {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        clearTimeout(w.timer);
        w.resolve(message);
      }
    }
  }

  close(): void {
    this.closed = true;
    this.readyState = WebSocket.CLOSED;
  }

  /** Simulate an inbound client frame. */
  client(message: unknown): void {
    this.messageHandler?.(Buffer.from(JSON.stringify(message), 'utf8'));
  }

  raw(text: string): void {
    this.messageHandler?.(Buffer.from(text, 'utf8'));
  }

  waitFor(
    pred: (m: ServerTerminalMessage) => boolean,
    timeoutMs = 4000,
  ): Promise<ServerTerminalMessage> {
    const existing = this.received.find(pred);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout waiting for message')), timeoutMs);
      this.waiters.push({ pred, resolve, timer });
    });
  }

  asWebSocket(): WebSocket {
    return this as unknown as WebSocket;
  }
}

describe('TerminalGateway', () => {
  let service: TerminalService | null = null;

  function harness(terminal: Record<string, unknown> = { command: 'cat' }): {
    service: TerminalService;
    gateway: TerminalGateway;
  } {
    service = new TerminalService(makeConfig(terminal), noTasks);
    return { service, gateway: new TerminalGateway(service) };
  }

  afterEach(() => {
    service?.onModuleDestroy();
    service = null;
  });

  it('attaches with a valid token, then echoes input', async () => {
    const { service: svc, gateway } = harness();
    const sock = new FakeSocket();
    gateway.handleConnection(sock.asWebSocket());

    const token = svc.mintToken('s1');
    sock.client({ type: 'attach', sessionId: 's1', token, cols: 80, rows: 24 });
    await sock.waitFor((m) => m.type === 'status' && m.phase === 'ready');

    sock.client({ type: 'input', data: b64('ping\n') });
    const out = await sock.waitFor(
      (m) => m.type === 'output' && Buffer.from(m.data, 'base64').toString('utf8').includes('ping'),
    );
    expect(out.type).toBe('output');
  });

  it('rejects an invalid token and closes the socket', () => {
    const { gateway } = harness();
    const sock = new FakeSocket();
    gateway.handleConnection(sock.asWebSocket());

    sock.client({ type: 'attach', sessionId: 's2', token: 'bogus', cols: 80, rows: 24 });

    const err = sock.received.find((m) => m.type === 'error');
    expect(err).toMatchObject({ type: 'error', code: 'unauthorized' });
    expect(sock.closed).toBe(true);
  });

  it('rejects malformed JSON with bad-message', () => {
    const { gateway } = harness();
    const sock = new FakeSocket();
    gateway.handleConnection(sock.asWebSocket());

    sock.raw('this is not json');
    expect(sock.received.at(-1)).toMatchObject({ type: 'error', code: 'bad-message' });
  });

  it('rejects an unrecognized message shape with bad-message', () => {
    const { gateway } = harness();
    const sock = new FakeSocket();
    gateway.handleConnection(sock.asWebSocket());

    sock.client({ type: 'frobnicate', foo: 1 });
    expect(sock.received.at(-1)).toMatchObject({ type: 'error', code: 'bad-message' });
  });

  it('requires attach before input/resize', () => {
    const { gateway } = harness();
    const sock = new FakeSocket();
    gateway.handleConnection(sock.asWebSocket());

    sock.client({ type: 'input', data: b64('x') });
    expect(sock.received.at(-1)).toMatchObject({ type: 'error', code: 'bad-message' });
  });

  it('detaches (and reaps, with zero idle grace) on disconnect', async () => {
    const { service: svc, gateway } = harness({ command: 'cat', idleDisposeMs: 0 });
    const sock = new FakeSocket();
    gateway.handleConnection(sock.asWebSocket());

    const token = svc.mintToken('s6');
    sock.client({ type: 'attach', sessionId: 's6', token, cols: 80, rows: 24 });
    await sock.waitFor((m) => m.type === 'status' && m.phase === 'ready');
    expect(svc.has('s6')).toBe(true);

    gateway.handleDisconnect(sock.asWebSocket());
    expect(svc.has('s6')).toBe(false);
  });
});
