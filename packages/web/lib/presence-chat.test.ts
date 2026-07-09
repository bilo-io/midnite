import { describe, expect, it } from 'vitest';
import {
  CHAT_RADIUS_PX,
  CHAT_TTL_BASE_MS,
  CHAT_TTL_MAX_MS,
  chatTtl,
  isChatLive,
  isWithinChatRadius,
} from './presence-chat';

describe('chatTtl', () => {
  it('scales with length, clamped to the max', () => {
    expect(chatTtl('')).toBe(CHAT_TTL_BASE_MS);
    expect(chatTtl('hi')).toBe(CHAT_TTL_BASE_MS + 2 * 40);
    expect(chatTtl('x'.repeat(500))).toBe(CHAT_TTL_MAX_MS);
  });
});

describe('isChatLive', () => {
  it('is true within the TTL and false past it', () => {
    expect(isChatLive(1_000, 'hi', 1_500)).toBe(true);
    expect(isChatLive(1_000, 'hi', 1_000 + chatTtl('hi'))).toBe(false);
  });
});

describe('isWithinChatRadius', () => {
  it('includes a peer inside the radius', () => {
    expect(isWithinChatRadius(0, 0, 100, 100)).toBe(true); // ~141px < 200
  });

  it('excludes a peer outside the radius', () => {
    expect(isWithinChatRadius(0, 0, CHAT_RADIUS_PX + 1, 0)).toBe(false);
  });

  it('honours a custom radius', () => {
    expect(isWithinChatRadius(0, 0, 50, 0, 40)).toBe(false);
    expect(isWithinChatRadius(0, 0, 30, 0, 40)).toBe(true);
  });
});
