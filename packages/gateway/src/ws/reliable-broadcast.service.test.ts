import { describe, expect, it } from 'vitest';
import { parseConfig, type MidniteConfig, type SequencedEnvelope } from '@midnite/shared';
import type { WebSocket } from 'ws';
import { ReliableBroadcastService } from './reliable-broadcast.service';
import type { WsBroadcastService } from './ws-broadcast.service';

function config(ringSize: number): MidniteConfig {
  return parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {}, ws: { ringSize } });
}

/** Capture what the underlying transport was handed. */
function fakeWs() {
  const teamSends: Array<{ teamId: string; payload: string }> = [];
  const allSends: string[] = [];
  const ws = {
    toTeam(teamId: string, payload: string) {
      teamSends.push({ teamId, payload });
    },
    toAll(_sockets: Iterable<WebSocket>, payload: string) {
      allSends.push(payload);
    },
    toUser() {},
  } as unknown as WsBroadcastService;
  return { ws, teamSends, allSends };
}

const parse = (p: string | undefined) => JSON.parse(p ?? '{}') as SequencedEnvelope<{ type: string }>;

describe('ReliableBroadcastService', () => {
  it('stamps a monotonic seq per channel and wraps the event', () => {
    const { ws, allSends } = fakeWs();
    const svc = new ReliableBroadcastService(ws, config(10));

    svc.toAll('tasks:all', [], { type: 'a' });
    svc.toAll('tasks:all', [], { type: 'b' });

    expect(parse(allSends[0]).seq).toBe(1);
    expect(parse(allSends[1]).seq).toBe(2);
    expect(parse(allSends[0]).event.type).toBe('a');
    expect(typeof parse(allSends[0]).ts).toBe('number');
  });

  it('keeps seq lines independent per scoped channel', () => {
    const { ws, teamSends } = fakeWs();
    const svc = new ReliableBroadcastService(ws, config(10));

    svc.toTeam('tasks:team:A', 'A', { type: 'x' });
    svc.toTeam('tasks:team:B', 'B', { type: 'y' });
    svc.toTeam('tasks:team:A', 'A', { type: 'z' });

    expect(parse(teamSends[0]?.payload).seq).toBe(1); // A #1
    expect(parse(teamSends[1]?.payload).seq).toBe(1); // B #1 — independent
    expect(parse(teamSends[2]?.payload).seq).toBe(2); // A #2
  });

  it('evicts the oldest events past ringSize but keeps seq climbing', () => {
    const { ws } = fakeWs();
    const svc = new ReliableBroadcastService(ws, config(3));

    for (let i = 0; i < 5; i++) svc.toAll('tasks:all', [], { type: `e${i}` });

    // Ring holds the last 3 (seq 3,4,5); since(2) returns them, since(0) can't reach the evicted 1,2.
    expect(svc.since('tasks:all', 2).map((e) => e.seq)).toEqual([3, 4, 5]);
    expect(svc.since('tasks:all', 0).map((e) => e.seq)).toEqual([3, 4, 5]);
    expect(svc.watermark('tasks:all')).toBe(5);
  });

  it('since(seq) returns only newer events', () => {
    const { ws } = fakeWs();
    const svc = new ReliableBroadcastService(ws, config(10));
    for (let i = 0; i < 4; i++) svc.toAll('c', [], { type: `e${i}` });
    expect(svc.since('c', 2).map((e) => e.seq)).toEqual([3, 4]);
    expect(svc.since('c', 4)).toEqual([]);
  });

  it('setRingSize trims existing rings', () => {
    const { ws } = fakeWs();
    const svc = new ReliableBroadcastService(ws, config(10));
    for (let i = 0; i < 6; i++) svc.toAll('c', [], { type: `e${i}` });
    svc.setRingSize(2);
    expect(svc.getRingSize()).toBe(2);
    expect(svc.since('c', 0).map((e) => e.seq)).toEqual([5, 6]);
  });
});
