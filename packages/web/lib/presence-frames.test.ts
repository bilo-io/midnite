import { describe, expect, it } from 'vitest';
import type { PresencePeer } from '@midnite/shared';
import { emptyPresence, reducePresence, shouldSendMove, type MoveSample } from './presence-frames';

const peer = (over: Partial<PresencePeer> & { peerId: string }): PresencePeer => ({
  name: 'Peer',
  variant: -1,
  tint: null,
  x: 0,
  y: 0,
  facing: 'down',
  scene: 'office',
  ...over,
});

describe('reducePresence', () => {
  it('applies a snapshot, setting self and filtering the own peer out', () => {
    const next = reducePresence(
      emptyPresence(),
      { type: 'presence.snapshot', selfId: 'me', peers: [peer({ peerId: 'me' }), peer({ peerId: 'a', name: 'Ada' })] },
      100,
    );
    expect(next.self).toBe('me');
    expect(Object.keys(next.peers)).toEqual(['a']);
    expect(next.peers.a).toMatchObject({ name: 'Ada', lastUpdate: 100 });
  });

  it('merges peer-updated, preserving an existing emote and ignoring self', () => {
    let slice = reducePresence(emptyPresence(), { type: 'presence.snapshot', selfId: 'me', peers: [peer({ peerId: 'a' })] }, 1);
    slice = reducePresence(slice, { type: 'presence.emote', peerId: 'a', emoji: '🎉' }, 2);
    slice = reducePresence(
      slice,
      { type: 'presence.peer-updated', peers: [peer({ peerId: 'a', x: 50 }), peer({ peerId: 'me', x: 9 })] },
      3,
    );
    expect(slice.peers.a).toMatchObject({ x: 50, emote: { emoji: '🎉', at: 2 }, lastUpdate: 3 });
    expect(slice.peers.me).toBeUndefined(); // own peer never enters the map
  });

  it('removes a peer on peer-left', () => {
    let slice = reducePresence(emptyPresence(), { type: 'presence.snapshot', selfId: 'me', peers: [peer({ peerId: 'a' })] }, 1);
    slice = reducePresence(slice, { type: 'presence.peer-left', peerId: 'a' }, 2);
    expect(slice.peers.a).toBeUndefined();
  });

  it('ignores an emote for an unknown peer', () => {
    const slice = reducePresence(emptyPresence(), { type: 'presence.emote', peerId: 'ghost', emoji: '👋' }, 1);
    expect(slice.peers).toEqual({});
  });

  it('applies a chat frame and preserves it across a position update', () => {
    let slice = reducePresence(emptyPresence(), { type: 'presence.snapshot', selfId: 'me', peers: [peer({ peerId: 'a' })] }, 1);
    slice = reducePresence(slice, { type: 'presence.chat', peerId: 'a', text: 'hi there' }, 2);
    expect(slice.peers.a).toMatchObject({ chat: { text: 'hi there', at: 2 } });
    slice = reducePresence(slice, { type: 'presence.peer-updated', peers: [peer({ peerId: 'a', x: 77 })] }, 3);
    expect(slice.peers.a).toMatchObject({ x: 77, chat: { text: 'hi there', at: 2 }, lastUpdate: 3 });
  });

  it('ignores a chat for an unknown peer', () => {
    const slice = reducePresence(emptyPresence(), { type: 'presence.chat', peerId: 'ghost', text: 'boo' }, 1);
    expect(slice.peers).toEqual({});
  });
});

describe('shouldSendMove', () => {
  const a: MoveSample = { x: 0, y: 0, facing: 'down', scene: 'office' };
  const b: MoveSample = { x: 10, y: 0, facing: 'down', scene: 'office' };

  it('throttles to the min interval', () => {
    expect(shouldSendMove(a, b, 1000, 1050, 100, 7000)).toBe(false); // 50ms < 100ms
    expect(shouldSendMove(a, b, 1000, 1150, 100, 7000)).toBe(true); // 150ms ≥ 100ms + changed
  });

  it('dedups a stationary sample once past the throttle', () => {
    expect(shouldSendMove(a, a, 1000, 1200, 100, 7000)).toBe(false); // unchanged
  });

  it('keepalives even when stationary past the keepalive window', () => {
    expect(shouldSendMove(a, a, 1000, 8500, 100, 7000)).toBe(true); // 7.5s ≥ keepalive
  });

  it('always sends the first sample (no prev)', () => {
    expect(shouldSendMove(null, a, 0, 200, 100, 7000)).toBe(true);
  });
});
