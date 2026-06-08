import type { IncomingMessage } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { parseConfig, type MidniteConfig, type ServerTerminalMessage } from '@midnite/shared';
import type { TasksService } from '../tasks/tasks.service';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';
import type { ApprovalService } from './approval.service';

// Drives the real gateway + real PTY service through a stand-in socket. The
// WsAdapter/Fastify upgrade plumbing is covered by the end-to-end run; here we
// pin the message protocol: zod validation, token auth, and message dispatch.

const noTasks = { listTasks: () => [] } as unknown as TasksService;

const noApprovals = {
  mintSecret: () => 'secret',
  verifySecret: () => true,
  requestDecision: async () => ({ decision: 'ask' as const }),
  resolveByUser: () => {},
  replayPending: () => {},
  clearSession: () => {},
} as unknown as ApprovalService;

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

  closeCode: number | undefined;
  close(code?: number): void {
    this.closed = true;
    this.closeCode = code;
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
    const config = makeConfig(terminal);
    service = new TerminalService(config, noTasks, noApprovals);
    return { service, gateway: new TerminalGateway(service, noApprovals, config) };
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

  it('rejects a disallowed Origin and never wires the socket', () => {
    const { gateway } = harness();
    const sock = new FakeSocket();
    const request = { headers: { origin: 'https://evil.com' } } as unknown as IncomingMessage;
    gateway.handleConnection(sock.asWebSocket(), request);

    expect(sock.closed).toBe(true);
    expect(sock.closeCode).toBe(1008);
    // handler was never attached, so inbound frames can't reach the service
    sock.client({ type: 'input', data: b64('x') });
    expect(sock.received).toHaveLength(0);
  });

  it('allows a loopback Origin', async () => {
    const { service: svc, gateway } = harness();
    const sock = new FakeSocket();
    const request = { headers: { origin: 'http://localhost:3000' } } as unknown as IncomingMessage;
    gateway.handleConnection(sock.asWebSocket(), request);

    const token = svc.mintToken('s-loop');
    sock.client({ type: 'attach', sessionId: 's-loop', token, cols: 80, rows: 24 });
    await sock.waitFor((m) => m.type === 'status' && m.phase === 'ready');
    expect(sock.closed).toBe(false);
  });
});
