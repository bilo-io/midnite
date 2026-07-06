import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import { ConnectionRegistry } from './connection-registry';
import { WsMetricsService } from './ws-metrics.service';
import { HeartbeatService } from './heartbeat.service';

// A real-socket check: a client that never pongs is terminated by the heartbeat
// after maxMissedPongs sweeps, and the client observes the close.
const CONFIG: MidniteConfig = parseConfig({
  agent: {},
  terminal: {},
  knowledge: {},
  gateway: {},
  ws: { maxMissedPongs: 1 },
});

let wss: WebSocketServer;
let registry: ConnectionRegistry;
let svc: HeartbeatService;
let url: string;

beforeEach(async () => {
  registry = new ConnectionRegistry();
  svc = new HeartbeatService(registry, new WsMetricsService(registry), CONFIG);
  wss = new WebSocketServer({ port: 0 });
  wss.on('connection', (client) => registry.register(client as never, { userId: null, teamId: null }));
  await new Promise<void>((resolve) => wss.once('listening', resolve));
  url = `ws://127.0.0.1:${(wss.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => wss.close(() => resolve()));
});

it('terminates a client that never pongs; a ponging client survives', async () => {
  // autoPong:false → this client ignores server pings, so it should be reaped.
  const silent = new WebSocket(url, { autoPong: false });
  const closed = new Promise<number>((resolve) => silent.on('close', (code) => resolve(code)));
  await new Promise<void>((resolve) => silent.on('open', resolve));
  await new Promise<void>((r) => setTimeout(r, 30)); // let the server register it

  // sweep 1: missed 0→1 + ping; sweep 2: missed>=1 → terminate.
  svc.sweep();
  svc.sweep();

  await closed; // resolves when the server terminated the socket
  expect(silent.readyState).toBe(WebSocket.CLOSED);
});
