import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { parseConfig, type MidniteConfig, type SequencedEnvelope } from '@midnite/shared';
import { ConnectionRegistry } from './connection-registry';
import { WsBroadcastService } from './ws-broadcast.service';
import { ReliableBroadcastService } from './reliable-broadcast.service';

// ringSize 3 so we can exercise eviction → gap → resync deterministically.
const CONFIG: MidniteConfig = parseConfig({
  agent: {}, terminal: {}, knowledge: {}, gateway: {}, ws: { ringSize: 3 },
});

function makeService(): ReliableBroadcastService {
  return new ReliableBroadcastService(new WsBroadcastService(new ConnectionRegistry()), CONFIG);
}

/** Push `n` events onto a ring line (no live subscribers — we only want the ring). */
function fill(svc: ReliableBroadcastService, key: string, n: number): void {
  for (let i = 0; i < n; i += 1) svc.toAll(key, [], { type: 'x', i });
}

/** A fake OPEN socket that records what the service writes to it. */
function fakeSocket(): { sent: unknown[]; socket: WebSocket } {
  const sent: unknown[] = [];
  const socket = { readyState: 1, send: (s: string) => sent.push(JSON.parse(s)) } as unknown as WebSocket;
  return { sent, socket };
}

describe('ReliableBroadcastService.resume (Phase 56 B)', () => {
  it('stamps the ring key as `ch` on every envelope', () => {
    const svc = makeService();
    const { socket, sent } = fakeSocket();
    fill(svc, 'tasks:all', 1);
    svc.handleSubscription(socket, ['tasks:all'], { type: 'resume', cursor: { 'tasks:all': 0 } });
    const frame = sent[0] as SequencedEnvelope<unknown>;
    expect(frame.ch).toBe('tasks:all');
    expect(frame.seq).toBe(1);
  });

  it('client already current → nothing to replay', () => {
    const svc = makeService();
    fill(svc, 'k', 2);
    expect(svc.resume('k', 2)).toEqual({ events: [], resyncRequired: false });
  });

  it('replays only events after the client cursor', () => {
    const svc = makeService();
    fill(svc, 'k', 3); // seqs 1,2,3 (ring holds all 3)
    const { events, resyncRequired } = svc.resume('k', 1);
    expect(resyncRequired).toBe(false);
    expect(events.map((e) => e.seq)).toEqual([2, 3]);
  });

  it('resyncs when the gap exceeds the ring (oldest retained > lastSeq+1)', () => {
    const svc = makeService();
    fill(svc, 'k', 5); // ringSize 3 → retains seqs 3,4,5; 1,2 evicted
    // Client last saw seq 1 → needs seq 2, which is gone → resync.
    expect(svc.resume('k', 1)).toEqual({ events: [], resyncRequired: true });
    // Client last saw seq 2 → needs seq 3, still retained → replay 3,4,5.
    expect(svc.resume('k', 2).events.map((e) => e.seq)).toEqual([3, 4, 5]);
  });

  it('resyncs when the client is ahead of us (gateway restarted → seq reset)', () => {
    const svc = makeService();
    fill(svc, 'k', 2); // watermark 2
    expect(svc.resume('k', 9)).toEqual({ events: [], resyncRequired: true });
  });
});

describe('ReliableBroadcastService.handleSubscription (Phase 56 B)', () => {
  it('a fresh subscribe sends a single watermark anchoring each allowed line', () => {
    const svc = makeService();
    fill(svc, 'tasks:all', 4); // watermark 4
    fill(svc, 'tasks:team:T', 2); // watermark 2
    const { socket, sent } = fakeSocket();
    svc.handleSubscription(socket, ['tasks:all', 'tasks:team:T'], { type: 'subscribe' });
    expect(sent).toEqual([{ type: 'watermark', cursor: { 'tasks:all': 4, 'tasks:team:T': 2 } }]);
  });

  it('resume replays each allowed line after its cursor', () => {
    const svc = makeService();
    fill(svc, 'tasks:all', 2);
    fill(svc, 'tasks:team:T', 2);
    const { socket, sent } = fakeSocket();
    svc.handleSubscription(socket, ['tasks:all', 'tasks:team:T'], {
      type: 'resume',
      cursor: { 'tasks:all': 1, 'tasks:team:T': 0 },
    });
    // all: replay seq 2 (1 frame); team: replay seq 1,2 (2 frames). No control frames.
    const chs = sent.map((f) => (f as SequencedEnvelope<unknown>).ch);
    expect(chs).toEqual(['tasks:all', 'tasks:team:T', 'tasks:team:T']);
  });

  it('resume on a gapped line sends resync-required for that line', () => {
    const svc = makeService();
    fill(svc, 'tasks:all', 5); // ringSize 3 → 1,2 evicted
    const { socket, sent } = fakeSocket();
    svc.handleSubscription(socket, ['tasks:all'], { type: 'resume', cursor: { 'tasks:all': 1 } });
    expect(sent).toEqual([{ type: 'resync-required', ch: 'tasks:all' }]);
  });

  it('only ever touches allowed lines — a cursor for another scope is ignored', () => {
    const svc = makeService();
    fill(svc, 'tasks:all', 1);
    fill(svc, 'tasks:team:OTHER', 3);
    const { socket, sent } = fakeSocket();
    svc.handleSubscription(socket, ['tasks:all'], {
      type: 'resume',
      cursor: { 'tasks:all': 0, 'tasks:team:OTHER': 0 },
    });
    // Only the allowed all-line replays; the foreign team line is never read.
    const chs = sent.map((f) => (f as SequencedEnvelope<unknown>).ch);
    expect(chs).toEqual(['tasks:all']);
  });
});
