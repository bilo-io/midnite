import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  parseConfig,
  type MetricsEvent,
  type MidniteConfig,
  type SequencedEnvelope,
} from '@midnite/shared';
import type { WebSocket } from 'ws';
import { ConnectionRegistry } from '../ws/connection-registry';
import { WsBroadcastService } from '../ws/ws-broadcast.service';
import { ReliableBroadcastService } from '../ws/reliable-broadcast.service';
import { MetricsEventBus } from './metrics-event-bus';
import { MetricsGateway } from './metrics.gateway';

const CONFIG: MidniteConfig = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });
const req = { headers: { origin: 'http://localhost:3000' } } as unknown as IncomingMessage;

function fakeClient() {
  let onMessage: ((raw: Buffer) => void) | undefined;
  const sent: MetricsEvent[] = [];
  const ws = {
    readyState: 1,
    on(event: string, cb: (raw: Buffer) => void) {
      if (event === 'message') onMessage = cb;
    },
    send(payload: string) {
      const frame = JSON.parse(payload) as { type?: string };
      if (frame.type === 'watermark' || frame.type === 'resync-required') return;
      sent.push((frame as unknown as SequencedEnvelope<MetricsEvent>).event);
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

function makeGateway(config: MidniteConfig = CONFIG) {
  const bus = new MetricsEventBus();
  const registry = new ConnectionRegistry();
  const reliable = new ReliableBroadcastService(new WsBroadcastService(registry), config);
  const gateway = new MetricsGateway(config, bus, registry, reliable);
  gateway.onModuleInit();
  return { gateway, bus };
}

const gaugesEvent: MetricsEvent = {
  type: 'metrics.gauges',
  gauges: { queueDepth: 2, slotsUsed: 1, slotsTotal: 4, lastTickLatencyMs: 8, updatedAt: 'now' },
};

describe('MetricsGateway', () => {
  it('broadcasts gauge snapshots to every subscribed client', () => {
    const { gateway, bus } = makeGateway();
    const a = fakeClient();
    const b = fakeClient();
    gateway.handleConnection(a.ws, req);
    gateway.handleConnection(b.ws, req);
    a.subscribe();
    b.subscribe();

    bus.emit(gaugesEvent);

    expect(a.sent).toHaveLength(1);
    expect(a.sent[0]).toMatchObject({ type: 'metrics.gauges', gauges: { queueDepth: 2 } });
    expect(b.sent).toHaveLength(1);
  });

  it('does not deliver to a client that never subscribed', () => {
    const { gateway, bus } = makeGateway();
    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    bus.emit(gaugesEvent);
    expect(a.sent).toHaveLength(0);
  });

  it('is a no-op broadcast when there are no subscribers', () => {
    const { bus } = makeGateway();
    expect(() => bus.emit(gaugesEvent)).not.toThrow();
  });

  it('ignores malformed frames', () => {
    const { gateway, bus } = makeGateway();
    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    a.sendRaw('not json');
    a.sendRaw(JSON.stringify({ type: 'nope' }));
    bus.emit(gaugesEvent);
    expect(a.sent).toHaveLength(0);
  });

  it('stops delivering after disconnect', () => {
    const { gateway, bus } = makeGateway();
    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    a.subscribe();
    gateway.handleDisconnect(a.ws);
    bus.emit(gaugesEvent);
    expect(a.sent).toHaveLength(0);
  });

  it('rejects a disallowed origin', () => {
    const rejectConfig = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: { allowedOrigins: [] } });
    const { gateway } = makeGateway(rejectConfig);
    let closed = false;
    const ws = {
      readyState: 1,
      on() {},
      send() {},
      close() {
        closed = true;
      },
    } as unknown as WebSocket;
    gateway.handleConnection(ws, { headers: { origin: 'https://evil.example' } } as unknown as IncomingMessage);
    expect(closed).toBe(true);
  });
});
