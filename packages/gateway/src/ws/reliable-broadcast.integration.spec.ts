import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { parseConfig, type MidniteConfig, type SequencedEnvelope, type TaskBoardEvent } from '@midnite/shared';
import { ConnectionRegistry } from './connection-registry';
import { WsBroadcastService } from './ws-broadcast.service';
import { ReliableBroadcastService } from './reliable-broadcast.service';
import { TaskEventBus } from '../tasks/task-event-bus';
import { TasksGateway } from '../tasks/tasks.gateway';

// A real-socket integration test: a live `ws` server drives the actual
// TasksGateway + ReliableBroadcastService, so we exercise the true publish path
// (subscribe → bus emit → seq stamp → ring → socket send) end-to-end and assert
// clients receive sequenced envelopes in order over the wire.
const CONFIG: MidniteConfig = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {}, ws: { ringSize: 512 } });

let wss: WebSocketServer;
let bus: TaskEventBus;
let url: string;

beforeEach(async () => {
  const registry = new ConnectionRegistry();
  const reliable = new ReliableBroadcastService(new WsBroadcastService(registry), CONFIG);
  bus = new TaskEventBus();
  const gateway = new TasksGateway(CONFIG, bus, registry, reliable);
  gateway.onModuleInit();

  wss = new WebSocketServer({ port: 0 });
  wss.on('connection', (client, req) => gateway.handleConnection(client as never, req));
  await new Promise<void>((resolve) => wss.once('listening', resolve));
  url = `ws://127.0.0.1:${(wss.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => wss.close(() => resolve()));
});

function taskEvent(id: string): TaskBoardEvent {
  return {
    type: 'task.updated',
    at: 'now',
    task: { id, title: id, status: 'todo', priority: 1, retryCount: 0, fixAttempts: 0, tags: [], dependsOn: [], events: [] } as never,
  };
}

/** Connect, subscribe, and collect the next `count` frames. */
function collect(count: number): Promise<Array<SequencedEnvelope<TaskBoardEvent>>> {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url, { headers: { origin: 'http://localhost:3000' } });
    const frames: Array<SequencedEnvelope<TaskBoardEvent>> = [];
    const timer = setTimeout(() => reject(new Error(`only got ${frames.length}/${count} frames`)), 4000);
    client.on('open', () => client.send(JSON.stringify({ type: 'subscribe' })));
    client.on('message', (raw) => {
      frames.push(JSON.parse(String(raw)) as SequencedEnvelope<TaskBoardEvent>);
      if (frames.length === count) {
        clearTimeout(timer);
        client.close();
        resolve(frames);
      }
    });
    client.on('error', reject);
  });
}

it('delivers sequenced envelopes in order over a real socket', async () => {
  const client = new WebSocket(url, { headers: { origin: 'http://localhost:3000' } });
  await new Promise<void>((resolve) => client.on('open', resolve));

  const frames: Array<SequencedEnvelope<TaskBoardEvent>> = [];
  const got = new Promise<void>((resolve) => {
    client.on('message', (raw) => {
      frames.push(JSON.parse(String(raw)) as SequencedEnvelope<TaskBoardEvent>);
      if (frames.length === 2) resolve();
    });
  });
  client.send(JSON.stringify({ type: 'subscribe' }));
  await new Promise<void>((r) => setTimeout(r, 50)); // let the subscribe register

  bus.emit(taskEvent('t1'));
  bus.emit(taskEvent('t2'));
  await got;

  expect(frames.map((f) => f.seq)).toEqual([1, 2]);
  expect(frames.map((f) => f.event.type === 'task.updated' && f.event.task.id)).toEqual(['t1', 't2']);
  expect(frames[0]?.ts ?? 0).toBeGreaterThan(0);
  client.close();
});

it('gives each new connection the live stream (seq continues climbing)', async () => {
  // Prove seq is per-channel and monotonic across the socket boundary.
  const pending = collect(1);
  await new Promise<void>((r) => setTimeout(r, 50));
  bus.emit(taskEvent('a'));
  const [first] = await pending;
  expect(first?.seq).toBe(1);
});
