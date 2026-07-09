import { beforeEach, describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import type {
  ClientPresenceMessage,
  PresenceHelloMessage,
  ServerPresenceMessage,
} from '@midnite/shared';
import { WsBroadcastService } from '../ws/ws-broadcast.service';
import { PresenceService, type PresenceIdentity } from './presence.service';

/** A broadcast fake that records every (sockets, frame) fan-out. */
interface Sent {
  sockets: WebSocket[];
  frame: ServerPresenceMessage;
}
function fakeBroadcast() {
  const sent: Sent[] = [];
  const svc = {
    toAll(sockets: Iterable<WebSocket>, payload: string) {
      sent.push({ sockets: [...sockets], frame: JSON.parse(payload) as ServerPresenceMessage });
    },
  } as unknown as WsBroadcastService;
  return { svc, sent };
}

const sock = () => ({}) as unknown as WebSocket;
const guest = (): PresenceIdentity => ({ userId: null, teamId: null, verifiedName: null });
const hello = (over: Partial<PresenceHelloMessage> = {}): PresenceHelloMessage => ({
  type: 'presence.hello',
  name: 'Ada',
  variant: -1,
  tint: null,
  ghost: false,
  ...over,
});
const move = (x: number, y: number): ClientPresenceMessage => ({
  type: 'presence.move',
  x,
  y,
  facing: 'down',
  scene: 'office',
});

/** Frames that fanned out to a given socket. */
function framesTo(sent: Sent[], target: WebSocket): ServerPresenceMessage[] {
  return sent.filter((s) => s.sockets.includes(target)).map((s) => s.frame);
}

describe('PresenceService', () => {
  let now: number;
  let broadcast: ReturnType<typeof fakeBroadcast>;
  let svc: PresenceService;

  beforeEach(() => {
    now = 1000;
    broadcast = fakeBroadcast();
    svc = new PresenceService(broadcast.svc, undefined, undefined, () => now);
  });

  it('sends a snapshot on join (empty roster, with selfId)', () => {
    const a = sock();
    svc.join(a, guest(), hello());
    const snap = framesTo(broadcast.sent, a)[0];
    expect(snap).toMatchObject({ type: 'presence.snapshot', peers: [] });
    expect((snap as { selfId: string }).selfId).toMatch(/^guest:/);
  });

  it('coalesces many moves into one peer-updated per tick', () => {
    const a = sock();
    svc.join(a, guest(), hello());
    svc.handleMessage(a, move(10, 10));
    svc.handleMessage(a, move(20, 20));
    svc.handleMessage(a, move(30, 30));
    broadcast.sent.length = 0;
    svc.runTick(now);
    const updates = broadcast.sent.filter((s) => s.frame.type === 'presence.peer-updated');
    expect(updates).toHaveLength(1);
    expect(updates[0]!.frame).toMatchObject({ peers: [{ x: 30, y: 30 }] });
  });

  it('a second joiner snapshots the first (positioned) peer', () => {
    const a = sock();
    const b = sock();
    svc.join(a, guest(), hello({ name: 'Ada' }));
    svc.handleMessage(a, move(5, 5));
    broadcast.sent.length = 0;
    svc.join(b, guest(), hello({ name: 'Bo' }));
    const snap = framesTo(broadcast.sent, b)[0] as { type: string; peers: { name: string }[] };
    expect(snap.type).toBe('presence.snapshot');
    expect(snap.peers).toHaveLength(1);
    expect(snap.peers[0]!.name).toBe('Ada');
  });

  it('excludes ghost peers from snapshots + updates, and emits no peer-left on ghost leave', () => {
    const a = sock();
    const b = sock();
    svc.join(a, guest(), hello({ ghost: true }));
    svc.handleMessage(a, move(1, 1));
    svc.runTick(now);
    // A ghost never appears in a batch.
    expect(broadcast.sent.some((s) => s.frame.type === 'presence.peer-updated')).toBe(false);
    // ...nor in a joiner's snapshot.
    broadcast.sent.length = 0;
    svc.join(b, guest(), hello());
    expect((framesTo(broadcast.sent, b)[0] as { peers: unknown[] }).peers).toHaveLength(0);
    // ...and leaving is silent.
    broadcast.sent.length = 0;
    svc.leave(a);
    expect(broadcast.sent).toHaveLength(0);
  });

  it('departs a peer on the stale timeout', () => {
    const observer = sock();
    const a = sock();
    svc.join(observer, guest(), hello());
    svc.handleMessage(observer, move(0, 0));
    svc.join(a, guest(), hello());
    svc.handleMessage(a, move(1, 1));
    svc.runTick(now); // first batch
    broadcast.sent.length = 0;
    now += 20_000; // > default staleMs (15s)
    svc.handleMessage(observer, move(0, 1)); // keepalive keeps the observer fresh
    svc.runTick(now);
    // `a` went silent → the observer is told it left.
    expect(framesTo(broadcast.sent, observer)).toContainEqual(
      expect.objectContaining({ type: 'presence.peer-left' }),
    );
  });

  it('emits peer-left on disconnect for a visible peer, nothing for an unpositioned one', () => {
    const observer = sock();
    const a = sock();
    svc.join(observer, guest(), hello());
    svc.handleMessage(observer, move(0, 0));
    svc.join(a, guest(), hello());
    svc.handleMessage(a, move(1, 1));
    broadcast.sent.length = 0;
    svc.leave(a);
    expect(framesTo(broadcast.sent, observer)).toEqual([{ type: 'presence.peer-left', peerId: expect.any(String) }]);

    const b = sock();
    svc.join(b, guest(), hello()); // never moves → not renderable
    broadcast.sent.length = 0;
    svc.leave(b);
    expect(broadcast.sent).toHaveLength(0);
  });

  it('retracts a visible peer when it toggles ghost on mid-session', () => {
    const observer = sock();
    const a = sock();
    svc.join(observer, guest(), hello());
    svc.handleMessage(observer, move(0, 0));
    svc.join(a, guest(), hello({ name: 'Ada' }));
    svc.handleMessage(a, move(1, 1));
    svc.runTick(now); // Ada is now visible to the observer
    broadcast.sent.length = 0;
    // Ada goes ghost via a re-hello — the observer must be told she left now,
    // not silently keep her stale avatar until the next tick (which omits ghosts).
    svc.handleMessage(a, { ...hello({ name: 'Ada' }), ghost: true });
    expect(framesTo(broadcast.sent, observer)).toContainEqual(
      expect.objectContaining({ type: 'presence.peer-left' }),
    );
    // ...and the following tick emits no update for the now-ghost Ada.
    broadcast.sent.length = 0;
    svc.runTick(now);
    expect(broadcast.sent.some((s) => s.frame.type === 'presence.peer-updated')).toBe(false);
  });

  it('does not retract on a ghost→ghost or visible→visible re-hello', () => {
    const observer = sock();
    const a = sock();
    svc.join(observer, guest(), hello());
    svc.handleMessage(observer, move(0, 0));
    svc.join(a, guest(), hello({ name: 'Ada' }));
    svc.handleMessage(a, move(1, 1));
    svc.runTick(now);
    broadcast.sent.length = 0;
    // A plain re-hello (avatar change, still visible) never departs the peer.
    svc.handleMessage(a, hello({ name: 'Ada', variant: 3 }));
    expect(broadcast.sent.some((s) => s.frame.type === 'presence.peer-left')).toBe(false);
  });

  it('fans out an emote immediately with the peerId, suppressing ghosts', () => {
    const a = sock();
    svc.join(a, guest(), hello());
    svc.handleMessage(a, move(1, 1));
    broadcast.sent.length = 0;
    svc.handleMessage(a, { type: 'presence.emote', emoji: '🎉' });
    expect(broadcast.sent.map((s) => s.frame)).toContainEqual(
      expect.objectContaining({ type: 'presence.emote', emoji: '🎉' }),
    );
  });

  describe('chat (Theme G)', () => {
    it('fans out a chat immediately with the peerId, sanitizing the text', () => {
      const a = sock();
      svc.join(a, guest(), hello());
      svc.handleMessage(a, move(1, 1));
      broadcast.sent.length = 0;
      svc.handleMessage(a, { type: 'presence.chat', text: '  hi   there  ' });
      expect(broadcast.sent.map((s) => s.frame)).toContainEqual(
        expect.objectContaining({ type: 'presence.chat', text: 'hi there' }),
      );
    });

    it('drops a chat that sanitizes to empty', () => {
      const a = sock();
      svc.join(a, guest(), hello());
      svc.handleMessage(a, move(1, 1));
      broadcast.sent.length = 0;
      svc.handleMessage(a, { type: 'presence.chat', text: '   ' });
      expect(broadcast.sent).toHaveLength(0);
    });

    it('suppresses chat from a ghost peer', () => {
      const a = sock();
      svc.join(a, guest(), hello({ ghost: true }));
      svc.handleMessage(a, move(1, 1));
      broadcast.sent.length = 0;
      svc.handleMessage(a, { type: 'presence.chat', text: 'boo' });
      expect(broadcast.sent).toHaveLength(0);
    });

    it('rate-limits with a token bucket: bursts up to chatBurst, then drops until refill', () => {
      const a = sock();
      svc.join(a, guest(), hello());
      svc.handleMessage(a, move(1, 1));
      broadcast.sent.length = 0;
      // Default chatBurst is 5 — send 7 back-to-back (same tick, no refill).
      for (let i = 0; i < 7; i++) svc.handleMessage(a, { type: 'presence.chat', text: `m${i}` });
      const chats = broadcast.sent.filter((s) => s.frame.type === 'presence.chat');
      expect(chats).toHaveLength(5);
      // Advance one refill interval → one more token → one more message allowed.
      now += 1_000;
      broadcast.sent.length = 0;
      svc.handleMessage(a, { type: 'presence.chat', text: 'again' });
      svc.handleMessage(a, { type: 'presence.chat', text: 'blocked' });
      expect(broadcast.sent.filter((s) => s.frame.type === 'presence.chat')).toHaveLength(1);
    });
  });

  describe('identity', () => {
    it('guest mode trusts the hello name', () => {
      const a = sock();
      const b = sock();
      svc.join(a, guest(), hello({ name: 'Guest McGee' }));
      svc.handleMessage(a, move(1, 1));
      svc.join(b, guest(), hello());
      const snap = framesTo(broadcast.sent, b)[0] as { peers: { name: string }[] };
      expect(snap.peers[0]!.name).toBe('Guest McGee');
    });

    it('JWT mode overrides a forged hello name with the verified identity', () => {
      const a = sock();
      const b = sock();
      const id: PresenceIdentity = { userId: 'u1', teamId: 't1', verifiedName: 'ada@corp.dev' };
      svc.join(a, id, hello({ name: 'NotAda' }));
      svc.handleMessage(a, move(1, 1));
      svc.join(b, { userId: 'u2', teamId: 't1', verifiedName: 'bo@corp.dev' }, hello());
      const snap = framesTo(broadcast.sent, b)[0] as { peers: { name: string; peerId: string }[] };
      expect(snap.peers[0]!.name).toBe('ada@corp.dev');
      expect(snap.peers[0]!.peerId).toBe('user:u1');
    });

    it('scopes presence to the team (team A never sees team B)', () => {
      const a = sock();
      const b = sock();
      svc.join(a, { userId: 'u1', teamId: 'A', verifiedName: 'a@x' }, hello());
      svc.handleMessage(a, move(1, 1));
      broadcast.sent.length = 0;
      // A joiner on team B snapshots an empty roster.
      svc.join(b, { userId: 'u2', teamId: 'B', verifiedName: 'b@x' }, hello());
      expect((framesTo(broadcast.sent, b)[0] as { peers: unknown[] }).peers).toHaveLength(0);
      // A's move batch never reaches B's socket.
      broadcast.sent.length = 0;
      svc.handleMessage(a, move(2, 2));
      svc.runTick(now);
      expect(framesTo(broadcast.sent, b)).toHaveLength(0);
    });

    it('coalesces a duplicate connection from one user to the newest socket', () => {
      const a1 = sock();
      const a2 = sock();
      const id: PresenceIdentity = { userId: 'u1', teamId: null, verifiedName: 'a@x' };
      svc.join(a1, id, hello());
      svc.handleMessage(a1, move(1, 1));
      svc.join(a2, id, hello()); // same user, new socket
      svc.handleMessage(a2, move(9, 9));
      svc.runTick(now);
      // Only one peer (peerId user:u1) exists — the stale socket was dropped.
      const batch = broadcast.sent.find((s) => s.frame.type === 'presence.peer-updated')!.frame as {
        peers: { peerId: string; x: number }[];
      };
      expect(batch.peers).toHaveLength(1);
      expect(batch.peers[0]).toMatchObject({ peerId: 'user:u1', x: 9 });
      // The old socket leaving is now a no-op.
      broadcast.sent.length = 0;
      svc.leave(a1);
      expect(broadcast.sent).toHaveLength(0);
    });
  });

  describe('summary (Theme F)', () => {
    it('counts renderable non-ghost peers in the caller scope', () => {
      const a = sock();
      const b = sock();
      svc.join(a, guest(), hello({ name: 'Ada' }));
      svc.handleMessage(a, move(5, 6));
      svc.join(b, guest(), hello({ name: 'Bo', ghost: true }));
      svc.handleMessage(b, move(1, 1));
      const summary = svc.summary(null);
      expect(summary.count).toBe(1); // Bo is a ghost → excluded
      expect(summary.peers[0]).toMatchObject({ name: 'Ada', scene: 'office' });
    });

    it('omits peers who have not moved yet (not renderable)', () => {
      const a = sock();
      svc.join(a, guest(), hello());
      expect(svc.summary(null).count).toBe(0);
    });

    it('is team-scoped — team A is invisible to a team-B caller', () => {
      const a = sock();
      svc.join(a, { userId: 'u1', teamId: 'A', verifiedName: 'a@x' }, hello());
      svc.handleMessage(a, move(2, 2));
      expect(svc.summary('A').count).toBe(1);
      expect(svc.summary('B').count).toBe(0);
      expect(svc.summary(null).count).toBe(0);
    });
  });
});
