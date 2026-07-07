import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canLocate,
  locatePlayer,
  samplePlayer,
  sceneFacing,
  setPresenceLocator,
  setPresenceSampler,
} from './presence-bridge';

afterEach(() => {
  setPresenceSampler(null);
  setPresenceLocator(null);
});

describe('sceneFacing', () => {
  it('maps 2D facing + flip to the wire facing', () => {
    expect(sceneFacing('up', false)).toBe('up');
    expect(sceneFacing('down', false)).toBe('down');
    expect(sceneFacing('side', true)).toBe('left');
    expect(sceneFacing('side', false)).toBe('right');
  });
});

describe('sampler sink', () => {
  it('forwards to the registered sampler, and is a no-op once cleared', () => {
    const fn = vi.fn();
    setPresenceSampler(fn);
    samplePlayer(1, 2, 'up', 'office');
    expect(fn).toHaveBeenCalledWith(1, 2, 'up', 'office');
    setPresenceSampler(null);
    samplePlayer(3, 4, 'down', 'office');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('locate sink', () => {
  it('reports availability + forwards to the registered locator', () => {
    expect(canLocate()).toBe(false);
    const fn = vi.fn();
    setPresenceLocator(fn);
    expect(canLocate()).toBe(true);
    locatePlayer(50, 60);
    expect(fn).toHaveBeenCalledWith(50, 60);
    setPresenceLocator(null);
    expect(canLocate()).toBe(false);
    locatePlayer(7, 8); // no-op
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
