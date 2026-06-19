import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { parseConfig, type MidniteConfig, type TaskBoardEvent } from '@midnite/shared';
import type { WebSocket } from 'ws';
import { TaskEventBus } from './task-event-bus';
import { TasksGateway } from './tasks.gateway';

const CONFIG: MidniteConfig = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });
const req = { headers: { origin: 'http://localhost:3000' } } as unknown as IncomingMessage;

function fakeClient() {
  let onMessage: ((raw: Buffer) => void) | undefined;
  const sent: TaskBoardEvent[] = [];
  const ws = {
    readyState: 1, // WebSocket.OPEN
    on(event: string, cb: (raw: Buffer) => void) {
      if (event === 'message') onMessage = cb;
    },
    send(payload: string) {
      sent.push(JSON.parse(payload) as TaskBoardEvent);
    },
  };
  return {
    ws: ws as unknown as WebSocket,
    sent,
    subscribe() {
      onMessage?.(Buffer.from(JSON.stringify({ type: 'subscribe' })));
    },
    sendRaw(text: string) {
      onMessage?.(Buffer.from(text));
    },
  };
}

function event(id: string): TaskBoardEvent {
  return { type: 'task.deleted', at: 'now', id };
}

describe('TasksGateway', () => {
  it('broadcasts board events to every subscribed client', () => {
    const bus = new TaskEventBus();
    const gateway = new TasksGateway(CONFIG, bus);
    gateway.onModuleInit();

    const a = fakeClient();
    const b = fakeClient();
    gateway.handleConnection(a.ws, req);
    gateway.handleConnection(b.ws, req);
    a.subscribe();
    b.subscribe();

    bus.emit(event('t1'));

    expect(a.sent).toHaveLength(1);
    expect(b.sent).toHaveLength(1);
    expect(a.sent[0]).toMatchObject({ type: 'task.deleted', id: 't1' });
  });

  it('does not deliver to a client that connected but never subscribed', () => {
    const bus = new TaskEventBus();
    const gateway = new TasksGateway(CONFIG, bus);
    gateway.onModuleInit();

    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    // no subscribe message
    bus.emit(event('t1'));
    expect(a.sent).toHaveLength(0);
  });

  it('ignores a malformed message (no subscription registered)', () => {
    const bus = new TaskEventBus();
    const gateway = new TasksGateway(CONFIG, bus);
    gateway.onModuleInit();

    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    a.sendRaw('not json');
    a.sendRaw(JSON.stringify({ type: 'nope' }));
    bus.emit(event('t1'));
    expect(a.sent).toHaveLength(0);
  });

  it('stops delivering after a client disconnects', () => {
    const bus = new TaskEventBus();
    const gateway = new TasksGateway(CONFIG, bus);
    gateway.onModuleInit();

    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    a.subscribe();
    gateway.handleDisconnect(a.ws);

    bus.emit(event('t1'));
    expect(a.sent).toHaveLength(0);
  });

  it('rejects a disallowed origin', () => {
    const bus = new TaskEventBus();
    const gateway = new TasksGateway(
      parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: { allowedOrigins: [] } }),
      bus,
    );
    gateway.onModuleInit();
    let closed = false;
    const ws = {
      readyState: 1,
      on() {},
      send() {},
      close() {
        closed = true;
      },
    } as unknown as WebSocket;
    gateway.handleConnection(ws, {
      headers: { origin: 'https://evil.example' },
    } as unknown as IncomingMessage);
    expect(closed).toBe(true);
  });
});
