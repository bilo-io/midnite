/**
 * Stable ("sticky") seat assignment for the office (E3). An agent keeps the seat
 * index it first claimed until it leaves the group; a newcomer takes the lowest
 * free index in `[0, capacity)`. This stops seated agents musical-chairsing when
 * the activity-sorted input reorders — they only move when they genuinely change
 * rooms (desk ↔ lounge).
 */

import type { OfficeAgent } from './agents';

export interface SeatAssignment {
  agent: OfficeAgent;
  seatIndex: number;
}

/**
 * Assign each agent in `group` a stable seat index, **mutating `map`** (agent id →
 * seat index) in place so claims persist across calls: entries for agents no longer
 * in `group` are released, existing claims are kept untouched, and each newcomer
 * takes the lowest free index. Agents that can't get a seat (group larger than
 * `capacity`) are skipped. Returns the agents paired with their seat index.
 */
export function assignStableSeats(
  group: OfficeAgent[],
  capacity: number,
  map: Map<string, number>,
): SeatAssignment[] {
  const present = new Set(group.map((a) => a.id));
  for (const id of [...map.keys()]) if (!present.has(id)) map.delete(id);
  const taken = new Set(map.values());
  const result: SeatAssignment[] = [];
  for (const agent of group) {
    let seat = map.get(agent.id);
    if (seat === undefined) {
      seat = 0;
      while (seat < capacity && taken.has(seat)) seat++;
      if (seat >= capacity) continue; // group exceeds capacity — no free seat
      map.set(agent.id, seat);
      taken.add(seat);
    }
    result.push({ agent, seatIndex: seat });
  }
  return result;
}
