import { describe, expect, it } from 'vitest';
import type { OfficeAgent } from './agents';
import { assignStableSeats } from './seats';

/** Minimal agent stub — assignStableSeats only reads `id`. */
const agent = (id: string): OfficeAgent => ({ id }) as unknown as OfficeAgent;
const seatsOf = (group: OfficeAgent[], capacity: number, map: Map<string, number>) =>
  Object.fromEntries(assignStableSeats(group, capacity, map).map((s) => [s.agent.id, s.seatIndex]));

describe('assignStableSeats (sticky office seats)', () => {
  it('fills the lowest free indices in input order for newcomers', () => {
    const map = new Map<string, number>();
    expect(seatsOf([agent('a'), agent('b'), agent('c')], 6, map)).toEqual({ a: 0, b: 1, c: 2 });
  });

  it('keeps each agent on its seat even when the input order changes', () => {
    const map = new Map<string, number>();
    assignStableSeats([agent('a'), agent('b'), agent('c')], 6, map); // a=0, b=1, c=2
    // Re-run with a reshuffled order (e.g. activity-sorted) — claims must not move.
    expect(seatsOf([agent('c'), agent('a'), agent('b')], 6, map)).toEqual({ a: 0, b: 1, c: 2 });
  });

  it('releases a seat when an agent leaves; survivors stay put (a gap is left open)', () => {
    const map = new Map<string, number>();
    assignStableSeats([agent('a'), agent('b'), agent('c')], 6, map); // a=0, b=1, c=2
    expect(seatsOf([agent('a'), agent('c')], 6, map)).toEqual({ a: 0, c: 2 }); // b's seat 1 freed, no shuffle
    expect(map.has('b')).toBe(false);
  });

  it('lets a newcomer take the lowest freed gap', () => {
    const map = new Map<string, number>();
    assignStableSeats([agent('a'), agent('b'), agent('c')], 6, map); // a=0, b=1, c=2
    assignStableSeats([agent('a'), agent('c')], 6, map); // b leaves → seat 1 free
    expect(seatsOf([agent('a'), agent('c'), agent('d')], 6, map)).toEqual({ a: 0, c: 2, d: 1 });
  });

  it('skips agents that exceed capacity', () => {
    const map = new Map<string, number>();
    const result = assignStableSeats([agent('a'), agent('b'), agent('c')], 2, map);
    expect(result.map((s) => s.agent.id)).toEqual(['a', 'b']);
    expect(map.has('c')).toBe(false);
  });
});
