/**
 * Phase 63 Theme C — pure agent→avatar placement. Mirrors the 2D office's
 * `renderActors` room routing ([`office-scene.ts`](../../components/office/scenes/office-scene.ts))
 * so a 3D avatar sits at the *same* seat its 2D robot would: `wip`→hot desks,
 * `waiting`→boardroom chairs, `done`/`idle`→pool loungers. Uses the same
 * `statusToRoom` + `assignStableSeats` helpers as 2D, so seats stay stable across
 * refetches identically. `three`-free — the r3f `<AgentAvatars>` component turns
 * these placements into meshes, keeping the routing math unit-testable.
 *
 * Avatar tint/variant are **re-derived here** (not imported from
 * [`textures.ts`](../office/textures.ts)) on purpose: that module is the Phaser
 * canvas-art factory, and importing a value from it would drag the 2D engine into
 * the 3D bundle, breaking the Phase-63 engine-isolation rule. The hash constants
 * match `agentTint`/`robotVariant` so a given agent keeps one identity in both views.
 */

import type { OfficeAgent } from '@/lib/office/agents';
import { DESK_SEATS, LOUNGE_SEATS, TABLE_CHAIRS, statusToRoom } from '@/lib/office/layout';
import { assignStableSeats } from '@/lib/office/seats';
import { tileToWorld } from './constants';

/** Identity palette — mirrors `IDENTITY_TINTS` in `textures.ts`. */
const IDENTITY_TINTS = [
  0xf9a8d4, 0xa5b4fc, 0x86efac, 0xfcd34d, 0xfca5a5, 0x67e8f9, 0xc4b5fd, 0xfdba74,
] as const;

/** Number of robot silhouette variants — mirrors `ROBOT_VARIANTS.length` (5). */
const VARIANT_COUNT = 5;

/** Deterministic identity tint for an agent id (matches 2D `agentTint`). */
export function avatarTint(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return IDENTITY_TINTS[hash % IDENTITY_TINTS.length]!;
}

/** Deterministic silhouette index for an agent id (matches 2D `robotVariant`). */
export function avatarVariant(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return hash % VARIANT_COUNT;
}

/** Where an avatar is seated — only `desk`-kind avatars are interactable. */
export type AvatarKind = 'desk' | 'lounge';

/** A resolved avatar: which agent, where (world units), and how it renders. */
export interface AvatarPlacement {
  agent: OfficeAgent;
  /** World-space centre X (east). */
  x: number;
  /** World-space centre Z (south — the 2D grid's +y row axis). */
  z: number;
  kind: AvatarKind;
  /** True for desk/board seats — the player can walk up + press E to open the panel. */
  interactable: boolean;
  tint: number;
  variant: number;
}

/**
 * Persistent seat claims across renders — mirrors the 2D scene's `deskByAgent` /
 * `loungeByAgent` maps so an agent keeps its seat until it leaves the group.
 * Board agents get their own map (2D shares the desk map, but a separate one is
 * equivalent since an agent is only ever in one group at a time).
 */
export interface SeatMaps {
  desk: Map<string, number>;
  board: Map<string, number>;
  lounge: Map<string, number>;
}

export function createSeatMaps(): SeatMaps {
  return { desk: new Map(), board: new Map(), lounge: new Map() };
}

/**
 * Partition the live agents into their status-derived rooms and assign each a
 * stable seat, returning the world-space avatar placements. Each agent lands in
 * exactly one bucket, in priority **lounge → board → desk** — mirroring the 2D
 * scene's effective outcome, where an `idle` session (or a `done`/`pool` task)
 * ends up in the lounge even if it also carries a `wip` task (2D's desk→board→
 * lounge build is last-write-wins, so the lounge pass wins). A task-less agent
 * that isn't idle defaults to a desk (`taskStatus ?? 'wip'`), same as 2D.
 */
export function computeAvatarPlacements(agents: OfficeAgent[], maps: SeatMaps): AvatarPlacement[] {
  const deskAgents: OfficeAgent[] = [];
  const boardAgents: OfficeAgent[] = [];
  const loungeAgents: OfficeAgent[] = [];
  for (const a of agents) {
    if (statusToRoom(a.taskStatus) === 'pool' || a.status === 'idle') loungeAgents.push(a);
    else if (statusToRoom(a.taskStatus) === 'board') boardAgents.push(a);
    else if (statusToRoom(a.taskStatus ?? 'wip') === 'work') deskAgents.push(a);
  }
  deskAgents.length = Math.min(deskAgents.length, DESK_SEATS.length);
  boardAgents.length = Math.min(boardAgents.length, TABLE_CHAIRS.length);
  loungeAgents.length = Math.min(loungeAgents.length, LOUNGE_SEATS.length);

  const out: AvatarPlacement[] = [];
  const emit = (agent: OfficeAgent, seat: { x: number; y: number }, kind: AvatarKind, interactable: boolean) => {
    const { x, z } = tileToWorld(seat.x, seat.y);
    out.push({ agent, x, z, kind, interactable, tint: avatarTint(agent.id), variant: avatarVariant(agent.id) });
  };

  for (const s of assignStableSeats(deskAgents, DESK_SEATS.length, maps.desk)) {
    emit(s.agent, DESK_SEATS[s.seatIndex]!, 'desk', true);
  }
  for (const s of assignStableSeats(boardAgents, TABLE_CHAIRS.length, maps.board)) {
    emit(s.agent, TABLE_CHAIRS[s.seatIndex]!, 'desk', true);
  }
  for (const s of assignStableSeats(loungeAgents, LOUNGE_SEATS.length, maps.lounge)) {
    emit(s.agent, LOUNGE_SEATS[s.seatIndex]!, 'lounge', false);
  }
  return out;
}
