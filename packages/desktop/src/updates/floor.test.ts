import { describe, expect, it, vi } from 'vitest';

import {
  fetchBelowFloor,
  isBelowFloor,
  manifestFileForChannel,
  manifestUrlForChannel,
} from './floor';

describe('manifestFileForChannel', () => {
  it('maps each channel to its filename', () => {
    expect(manifestFileForChannel('stable')).toBe('version.json');
    expect(manifestFileForChannel('beta')).toBe('version.beta.json');
  });

  it('builds a raw URL per channel', () => {
    expect(manifestUrlForChannel('stable')).toMatch(/\/version\.json$/);
    expect(manifestUrlForChannel('beta')).toMatch(/\/version\.beta\.json$/);
  });
});

describe('isBelowFloor', () => {
  it('is true only when current is strictly below minSupported', () => {
    expect(isBelowFloor('0.1.0', '0.2.0')).toBe(true);
    expect(isBelowFloor('0.2.0', '0.2.0')).toBe(false);
    expect(isBelowFloor('0.3.0', '0.2.0')).toBe(false);
  });

  it('fails open on an absent or malformed floor', () => {
    expect(isBelowFloor('0.1.0')).toBe(false);
    expect(isBelowFloor('0.1.0', null)).toBe(false);
    expect(isBelowFloor('0.1.0', 'not-a-version')).toBe(false);
    expect(isBelowFloor('bad', '0.2.0')).toBe(false);
  });
});

describe('fetchBelowFloor', () => {
  const ok = (body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

  it('reports below-floor from the fetched manifest', async () => {
    const below = await fetchBelowFloor('0.1.0', 'stable', ok({ version: '0.3.0', minSupported: '0.2.0' }));
    expect(below).toBe(true);
  });

  it('is false when at or above the floor', async () => {
    const below = await fetchBelowFloor('0.2.0', 'stable', ok({ version: '0.3.0', minSupported: '0.2.0' }));
    expect(below).toBe(false);
  });

  it('fails open (false) on a non-OK response', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 404 }));
    expect(await fetchBelowFloor('0.1.0', 'stable', fetchImpl)).toBe(false);
  });

  it('fails open (false) when the fetch throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await fetchBelowFloor('0.1.0', 'stable', fetchImpl)).toBe(false);
  });
});
