import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { parseConfig, type MidniteConfig, type SequencedEnvelope, type WorkflowEvent } from '@midnite/shared';
import type { WebSocket } from 'ws';
import { ConnectionRegistry } from '../ws/connection-registry';
import { WsBroadcastService } from '../ws/ws-broadcast.service';
import { ReliableBroadcastService } from '../ws/reliable-broadcast.service';
import { WorkflowEventBus } from './workflow-event-bus';
import { WorkflowsGateway } from './workflows.gateway';

const CONFIG: MidniteConfig = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });

function fakeClient() {
  let onMessage: ((raw: Buffer) => void) | undefined;
  const sent: WorkflowEvent[] = [];
  const ws = {
    readyState: 1, // WebSocket.OPEN
    on(event: string, cb: (raw: Buffer) => void) {
      if (event === 'message') onMessage = cb;
    },
    send(payload: string) {
      const frame = JSON.parse(payload) as { type?: string };
      // Phase 56 B: a fresh subscribe first gets a `watermark` control frame — skip it.
      if (frame.type === 'watermark' || frame.type === 'resync-required') return;
      // Phase 56 A: unwrap the sequenced envelope.
      sent.push((frame as unknown as SequencedEnvelope<WorkflowEvent>).event);
    },
  };
  return {
    ws: ws as unknown as WebSocket,
    sent,
    subscribe(runId: string) {
      onMessage?.(Buffer.from(JSON.stringify({ type: 'subscribe', runId })));
    },
  };
}

const req = { headers: { origin: 'http://localhost:3000' } } as unknown as IncomingMessage;

function event(runId: string): WorkflowEvent {
  return { type: 'run.started', workflowId: 'wf', runId, at: 'now', triggerSource: 'manual' };
}

function makeGateway(cfg = CONFIG) {
  const bus = new WorkflowEventBus();
  const registry = new ConnectionRegistry();
  const wsBroadcast = new WsBroadcastService(registry);
  const reliable = new ReliableBroadcastService(wsBroadcast, cfg);
  const gateway = new WorkflowsGateway(cfg, bus, registry, reliable);
  gateway.onModuleInit();
  return { gateway, bus };
}

describe('WorkflowsGateway', () => {
  it('delivers an event only to clients subscribed to that run', () => {
    const { gateway, bus } = makeGateway();

    const a = fakeClient();
    const b = fakeClient();
    gateway.handleConnection(a.ws, req);
    gateway.handleConnection(b.ws, req);
    a.subscribe('run-1');
    b.subscribe('run-2');

    bus.emit(event('run-1'));

    expect(a.sent.map((e) => e.runId)).toEqual(['run-1']);
    expect(b.sent).toHaveLength(0);
  });

  it('stops delivering after a client disconnects', () => {
    const { gateway, bus } = makeGateway();

    const a = fakeClient();
    gateway.handleConnection(a.ws, req);
    a.subscribe('run-1');
    gateway.handleDisconnect(a.ws);

    bus.emit(event('run-1'));
    expect(a.sent).toHaveLength(0);
  });

  it('rejects a disallowed origin', () => {
    const { gateway } = makeGateway(
      parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: { allowedOrigins: [] } }),
    );
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
