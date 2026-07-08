import { describe, expect, it } from 'vitest';
import {
  ClientPresenceMessageSchema,
  PRESENCE_WS_PATH,
  PresenceSummarySchema,
  ServerPresenceMessageSchema,
} from './presence.js';

describe('ClientPresenceMessageSchema', () => {
  it('round-trips a hello, defaulting ghost to false', () => {
    expect(
      ClientPresenceMessageSchema.parse({ type: 'presence.hello', name: 'Ada', variant: -1, tint: null }),
    ).toEqual({ type: 'presence.hello', name: 'Ada', variant: -1, tint: null, ghost: false });
  });

  it('round-trips a move', () => {
    const msg = { type: 'presence.move' as const, x: 120, y: 64, facing: 'left' as const, scene: 'office' as const };
    expect(ClientPresenceMessageSchema.parse(msg)).toEqual(msg);
  });

  it('round-trips an emote', () => {
    expect(ClientPresenceMessageSchema.parse({ type: 'presence.emote', emoji: '👋' })).toEqual({
      type: 'presence.emote',
      emoji: '👋',
    });
  });

  it('rejects an out-of-range variant, an empty name, and an unknown scene', () => {
    expect(ClientPresenceMessageSchema.safeParse({ type: 'presence.hello', name: 'x', variant: 9, tint: null }).success).toBe(false);
    expect(ClientPresenceMessageSchema.safeParse({ type: 'presence.hello', name: '', variant: 0, tint: null }).success).toBe(false);
    expect(
      ClientPresenceMessageSchema.safeParse({ type: 'presence.move', x: 0, y: 0, facing: 'up', scene: 'space' }).success,
    ).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(ClientPresenceMessageSchema.safeParse({ type: 'presence.teleport' }).success).toBe(false);
  });
});

describe('ServerPresenceMessageSchema', () => {
  const peer = {
    peerId: 'p1',
    name: 'Ada',
    variant: 2,
    tint: 0xff8800,
    x: 10,
    y: 20,
    facing: 'down' as const,
    scene: 'corner' as const,
  };

  it('round-trips a snapshot + peer-updated batch', () => {
    expect(ServerPresenceMessageSchema.parse({ type: 'presence.snapshot', selfId: 'me', peers: [peer] })).toEqual({
      type: 'presence.snapshot',
      selfId: 'me',
      peers: [peer],
    });
    expect(ServerPresenceMessageSchema.parse({ type: 'presence.peer-updated', peers: [peer] })).toEqual({
      type: 'presence.peer-updated',
      peers: [peer],
    });
  });

  it('round-trips peer-left + emote', () => {
    expect(ServerPresenceMessageSchema.parse({ type: 'presence.peer-left', peerId: 'p1' })).toEqual({
      type: 'presence.peer-left',
      peerId: 'p1',
    });
    expect(ServerPresenceMessageSchema.parse({ type: 'presence.emote', peerId: 'p1', emoji: '🎉' })).toEqual({
      type: 'presence.emote',
      peerId: 'p1',
      emoji: '🎉',
    });
  });

  it('rejects a peer missing coordinates', () => {
    const { x: _x, ...noCoords } = peer;
    expect(ServerPresenceMessageSchema.safeParse({ type: 'presence.snapshot', peers: [noCoords] }).success).toBe(false);
  });
});

describe('PRESENCE_WS_PATH', () => {
  it('is the presence endpoint', () => {
    expect(PRESENCE_WS_PATH).toBe('/ws/presence');
  });
});

describe('PresenceSummarySchema', () => {
  it('round-trips a summary', () => {
    const summary = { count: 1, peers: [{ name: 'Ada', scene: 'office' as const, tint: 0xff8800 }] };
    expect(PresenceSummarySchema.parse(summary)).toEqual(summary);
  });

  it('rejects a negative count', () => {
    expect(PresenceSummarySchema.safeParse({ count: -1, peers: [] }).success).toBe(false);
  });
});
