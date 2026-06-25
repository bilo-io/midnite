import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { parseConfig, type MidniteConfig, type TaskBoardEvent } from '@midnite/shared';
import type { WebSocket } from 'ws';
import { TokenInvalidError } from '../auth/jwt.service';
import { ConnectionRegistry } from '../ws/connection-registry';
import { WsBroadcastService } from '../ws/ws-broadcast.service';
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
    close() {},
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

function makeGateway(jwtSvc?: { enabled: boolean; verifyAccessToken: (t: string) => { sub: string; teamId?: string | null } }) {
  const bus = new TaskEventBus();
  const registry = new ConnectionRegistry();
  const wsBroadcast = new WsBroadcastService(registry);
  const gateway = new TasksGateway(
    CONFIG,
    bus,
    registry,
    wsBroadcast,
    jwtSvc as never,
  );
  gateway.onModuleInit();
  return { gateway, bus, registry };
}

function taskEvent(id: string, teamId?: string): TaskBoardEvent {
  if (teamId) {
    return {
      type: 'task.updated',
      at: 'now',
      task: { id, title: id, status: 'todo', teamId, priority: 1, retryCount: 0, fixAttempts: 0, tags: [], dependsOn: [], events: [] } as never,
    };
  }
  return { type: 'task.deleted', at: 'now', id };
}

describe('TasksGateway', () => {
  it('broadcasts board events to every subscribed client', () => {
    const { gateway, bus } = makeGateway();

    const a = fakeClient();
    const b = fakeClient();
    gateway.handleConnection(a.ws, req);
    gateway.handleConnection(b.ws, req);
    a.subscribe();
    b.subscribe();

    bus.emit(taskEvent('t1'));

    expect(a.sent).toHaveLength(1);
    expect(b.sent).toHaveLength(1);
    expect(a.sent[0]).toMatchObject({ type: 'task.deleted', id: 't1' });
  });

  it('does not deliver to a client that connected but never subscribed', () => {
    const { gateway, bus } = makeGateway();

    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    bus.emit(taskEvent('t1'));
    expect(a.sent).toHaveLength(0);
  });

  it('ignores a malformed message (no subscription registered)', () => {
    const { gateway, bus } = makeGateway();

    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    a.sendRaw('not json');
    a.sendRaw(JSON.stringify({ type: 'nope' }));
    bus.emit(taskEvent('t1'));
    expect(a.sent).toHaveLength(0);
  });

  it('stops delivering after a client disconnects', () => {
    const { gateway, bus } = makeGateway();

    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    a.subscribe();
    gateway.handleDisconnect(a.ws);

    bus.emit(taskEvent('t1'));
    expect(a.sent).toHaveLength(0);
  });

  it('rejects a disallowed origin', () => {
    const bus = new TaskEventBus();
    const registry = new ConnectionRegistry();
    const wsBroadcast = new WsBroadcastService(registry);
    const gateway = new TasksGateway(
      parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: { allowedOrigins: [] } }),
      bus,
      registry,
      wsBroadcast,
    );
    gateway.onModuleInit();
    let closed = false;
    const ws = {
      readyState: 1,
      on() {},
      send() {},
      close() { closed = true; },
    } as unknown as WebSocket;
    gateway.handleConnection(ws, {
      headers: { origin: 'https://evil.example' },
    } as unknown as IncomingMessage);
    expect(closed).toBe(true);
  });
});

describe('TasksGateway — D3: WS scoping', () => {
  // One gateway instance; token determines which team context the connection gets.
  const jwtMulti = {
    enabled: true,
    verifyAccessToken: (t: string) =>
      t === 'tok-a'
        ? { sub: 'user-a', teamId: 'team-a' }
        : { sub: 'user-b', teamId: 'team-b' },
  };

  function reqWithToken(token: string): IncomingMessage {
    return {
      headers: { origin: 'http://localhost:3000' },
      url: `/ws/tasks?token=${token}`,
    } as unknown as IncomingMessage;
  }

  it('scoped task event reaches team-A client but not team-B client', () => {
    const { gateway, bus } = makeGateway(jwtMulti);

    const clientA = fakeClient();
    const clientB = fakeClient();

    gateway.handleConnection(clientA.ws, reqWithToken('tok-a'));
    gateway.handleConnection(clientB.ws, reqWithToken('tok-b'));
    clientA.subscribe();
    clientB.subscribe();

    bus.emit(taskEvent('t1', 'team-a'));

    expect(clientA.sent).toHaveLength(1);
    expect(clientB.sent).toHaveLength(0);
  });

  it('legacy task (no teamId) broadcasts to all subscribers', () => {
    const { gateway, bus } = makeGateway(jwtMulti);

    const clientA = fakeClient();
    const clientB = fakeClient();

    gateway.handleConnection(clientA.ws, reqWithToken('tok-a'));
    gateway.handleConnection(clientB.ws, reqWithToken('tok-b'));
    clientA.subscribe();
    clientB.subscribe();

    bus.emit(taskEvent('t1')); // no teamId → toAll(this.subscribers)

    expect(clientA.sent).toHaveLength(1);
    expect(clientB.sent).toHaveLength(1);
  });

  it('closes with 4001 when JWT mode is on and token is invalid', () => {
    const jwtBad = {
      enabled: true,
      verifyAccessToken: (_t: string) => { throw new TokenInvalidError(); },
    };
    const { gateway } = makeGateway(jwtBad);

    let closedWith: number | undefined;
    const ws = {
      readyState: 1,
      on() {},
      send() {},
      close(code: number) { closedWith = code; },
    } as unknown as WebSocket;

    gateway.handleConnection(ws, reqWithToken('bad-token'));
    expect(closedWith).toBe(4001);
  });

  it('static-token client (no JWT) receives all events', () => {
    const { gateway, bus } = makeGateway({ enabled: false, verifyAccessToken: (_t: string) => ({ sub: '' }) });

    const client = fakeClient();
    gateway.handleConnection(client.ws, req); // no token in URL
    client.subscribe();

    bus.emit(taskEvent('t1', 'team-a'));
    // JWT disabled → no team context → connection has teamId=null → not in byTeam['team-a']
    // scoped event goes to toTeam('team-a') which has no sockets for this client
    expect(client.sent).toHaveLength(0);

    bus.emit(taskEvent('t2')); // legacy task, no teamId → toAll
    expect(client.sent).toHaveLength(1);
  });
});
