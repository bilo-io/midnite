import { describe, expect, it } from 'vitest';

import type { OfficeAgent } from '@/lib/office/agents';
import { DESK_SEATS, LOUNGE_SEATS, TABLE_CHAIRS } from '@/lib/office/layout';
import type { Status } from '@midnite/shared';
import { tileToWorld } from './constants';
import {
  avatarTint,
  avatarVariant,
  computeAvatarPlacements,
  createSeatMaps,
} from './agents-3d';

/** Minimal OfficeAgent stub — the placement math only reads id/status/taskStatus. */
function agent(id: string, taskStatus?: Status, status: OfficeAgent['status'] = 'running'): OfficeAgent {
  return { id, name: id, project: 'p', status, taskStatus, activity: '' } as unknown as OfficeAgent;
}

describe('avatarTint / avatarVariant', () => {
  it('are deterministic for a given id', () => {
    expect(avatarTint('abc')).toBe(avatarTint('abc'));
    expect(avatarVariant('abc')).toBe(avatarVariant('abc'));
  });

  it('stay within their palette / variant bounds', () => {
    for (const id of ['a', 'session-1', 'zzz', '']) {
      expect(avatarVariant(id)).toBeGreaterThanOrEqual(0);
      expect(avatarVariant(id)).toBeLessThan(5);
      expect(avatarTint(id)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('computeAvatarPlacements — 2D room-routing parity', () => {
  it('seats a wip agent at the first hot desk (interactable)', () => {
    const [p] = computeAvatarPlacements([agent('a', 'wip')], createSeatMaps());
    const seat = tileToWorld(DESK_SEATS[0]!.x, DESK_SEATS[0]!.y);
    expect(p).toMatchObject({ kind: 'desk', interactable: true, x: seat.x, z: seat.z });
  });

  it('routes a waiting agent to a boardroom chair (interactable)', () => {
    const [p] = computeAvatarPlacements([agent('a', 'waiting')], createSeatMaps());
    const seat = tileToWorld(TABLE_CHAIRS[0]!.x, TABLE_CHAIRS[0]!.y);
    expect(p).toMatchObject({ kind: 'desk', interactable: true, x: seat.x, z: seat.z });
  });

  it('routes a done agent to a pool lounger (not interactable)', () => {
    const [p] = computeAvatarPlacements([agent('a', 'done')], createSeatMaps());
    const seat = tileToWorld(LOUNGE_SEATS[0]!.x, LOUNGE_SEATS[0]!.y);
    expect(p).toMatchObject({ kind: 'lounge', interactable: false, x: seat.x, z: seat.z });
  });

  it('routes an idle-session agent (no task) to the lounge', () => {
    const [p] = computeAvatarPlacements([agent('a', undefined, 'idle')], createSeatMaps());
    expect(p?.kind).toBe('lounge');
  });

  it('places an agent once, lounge winning for an idle session with a wip task (2D parity)', () => {
    // wip task but idle session → 2D's last-write-wins lands it in the lounge.
    const placements = computeAvatarPlacements([agent('a', 'wip', 'idle')], createSeatMaps());
    expect(placements).toHaveLength(1);
    expect(placements[0]!.kind).toBe('lounge');
  });

  it('ignores backlog/todo/abandoned agents (not on the floor)', () => {
    const placements = computeAvatarPlacements(
      [agent('a', 'todo'), agent('b', 'backlog'), agent('c', 'abandoned')],
      createSeatMaps(),
    );
    expect(placements).toHaveLength(0);
  });

  it('keeps an agent in the same seat across refetches (stable seating)', () => {
    const maps = createSeatMaps();
    const first = computeAvatarPlacements([agent('a', 'wip'), agent('b', 'wip')], maps);
    // Reorder the input (activity sort churn) — seats must not shuffle.
    const second = computeAvatarPlacements([agent('b', 'wip'), agent('a', 'wip')], maps);
    const seatOf = (ps: typeof first, id: string) => ps.find((p) => p.agent.id === id)!;
    expect(seatOf(second, 'a')).toMatchObject({ x: seatOf(first, 'a').x, z: seatOf(first, 'a').z });
    expect(seatOf(second, 'b')).toMatchObject({ x: seatOf(first, 'b').x, z: seatOf(first, 'b').z });
  });

  it('caps each room at its seat count', () => {
    const many = Array.from({ length: DESK_SEATS.length + 4 }, (_, i) => agent(`a${i}`, 'wip'));
    const placements = computeAvatarPlacements(many, createSeatMaps());
    expect(placements.filter((p) => p.kind === 'desk')).toHaveLength(DESK_SEATS.length);
  });
});
