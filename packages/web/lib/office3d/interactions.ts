/**
 * Phase 63 Theme C — the proximity + interaction bridge, pure. The 3D scene is a
 * second client of the office store contract: these helpers compute the *same*
 * proximity flags the 2D `update()` loop writes and dispatch the *same* store
 * transitions `tryInteract` does ([`office-scene.ts`](../../components/office/scenes/office-scene.ts)),
 * so [`office-hud.tsx`](../../components/office/office-hud.tsx) and every existing
 * modal work unmodified in 3D.
 *
 * Distances are in **world units** (1 tile = 1 unit). The 2D scene uses
 * `PROXIMITY = TILE * 1.6` for desks, `PROXIMITY * 1.3` for the board/kitchen/
 * library anchors, and `PROXIMITY * 1.5` for the console — reproduced here as
 * unit reaches so 3D "reach" matches 2D one-for-one.
 *
 * The corner-office **door** is intentionally absent: the 3D corner scene +
 * `nearDoor`/scene transition land in Theme E, so wiring the prompt here would be
 * a dead affordance. `three`-free and unit-testable.
 */

import { BOARD_POS, BOOKSHELF_POS, COFFEE_POS, CONSOLE_POS } from '@/lib/office/layout';
import type { AvatarPlacement } from './agents-3d';
import { tileToWorld } from './constants';

/** Reach (world units) to a desk/board agent — 2D `PROXIMITY = TILE * 1.6`. */
export const DESK_REACH = 1.6;
/** Reach to the board/kitchen/library anchors — 2D `PROXIMITY * 1.3`. */
export const ANCHOR_REACH = 1.6 * 1.3;
/** Reach to the console — 2D `PROXIMITY * 1.5` (the console is a smaller target). */
export const CONSOLE_REACH = 1.6 * 1.5;

/** A fixed interactable spot in the world (a room fixture). */
export type AnchorKind = 'board' | 'kitchen' | 'library' | 'playstation';

export interface Anchor {
  kind: AnchorKind;
  x: number;
  z: number;
  reach: number;
}

function anchor(kind: AnchorKind, tile: { x: number; y: number }, reach: number): Anchor {
  const { x, z } = tileToWorld(tile.x, tile.y);
  return { kind, x, z, reach };
}

/** The four fixed interactables, at the same tiles as the 2D interaction anchors. */
export const ANCHORS: readonly Anchor[] = [
  anchor('board', BOARD_POS, ANCHOR_REACH),
  anchor('kitchen', COFFEE_POS, ANCHOR_REACH),
  anchor('library', BOOKSHELF_POS, ANCHOR_REACH),
  anchor('playstation', CONSOLE_POS, CONSOLE_REACH),
];

/** The proximity flags the store mirrors — a subset of `OfficeState`. */
export interface ProximityState {
  nearbyId: string | null;
  nearBoard: boolean;
  nearKitchen: boolean;
  nearLibrary: boolean;
  nearPlaystation: boolean;
}

function within(px: number, pz: number, a: { x: number; z: number; reach: number }): boolean {
  const dx = px - a.x;
  const dz = pz - a.z;
  return dx * dx + dz * dz <= a.reach * a.reach;
}

/**
 * Compute the player's proximity flags from their world position: the nearest
 * interactable avatar within desk reach, plus a boolean per fixed anchor.
 */
export function resolveProximity(px: number, pz: number, avatars: readonly AvatarPlacement[]): ProximityState {
  let nearbyId: string | null = null;
  let best = DESK_REACH * DESK_REACH;
  for (const a of avatars) {
    if (!a.interactable) continue;
    const dx = px - a.x;
    const dz = pz - a.z;
    const d = dx * dx + dz * dz;
    if (d <= best) {
      best = d;
      nearbyId = a.agent.id;
    }
  }
  const flag = (kind: AnchorKind) => {
    const a = ANCHORS.find((x) => x.kind === kind)!;
    return within(px, pz, a);
  };
  return {
    nearbyId,
    nearBoard: flag('board'),
    nearKitchen: flag('kitchen'),
    nearLibrary: flag('library'),
    nearPlaystation: flag('playstation'),
  };
}

/** The action a key-press / click resolves to (null = nothing in reach). */
export type InteractionAction =
  | { kind: 'board' }
  | { kind: 'break' }
  | { kind: 'library' }
  | { kind: 'playstation' }
  | { kind: 'agent'; id: string }
  | null;

/**
 * The E/Enter dispatch: pick the interaction from proximity flags in the exact
 * priority order 2D `tryInteract` uses — board → kitchen(break) → library →
 * playstation → nearest desk agent.
 */
export function pickInteraction(p: ProximityState): InteractionAction {
  if (p.nearBoard) return { kind: 'board' };
  if (p.nearKitchen) return { kind: 'break' };
  if (p.nearLibrary) return { kind: 'library' };
  if (p.nearPlaystation) return { kind: 'playstation' };
  if (p.nearbyId) return { kind: 'agent', id: p.nearbyId };
  return null;
}

/** A crosshair-raycast target — a fixture or an interactable avatar. */
export interface Target {
  action: Exclude<InteractionAction, null>;
  x: number;
  z: number;
  reach: number;
}

/** Build the click-raycast target set: the fixed anchors + interactable avatars. */
export function buildTargets(avatars: readonly AvatarPlacement[]): Target[] {
  const anchorAction: Record<AnchorKind, Exclude<InteractionAction, null>> = {
    board: { kind: 'board' },
    kitchen: { kind: 'break' },
    library: { kind: 'library' },
    playstation: { kind: 'playstation' },
  };
  const targets: Target[] = ANCHORS.map((a) => ({ action: anchorAction[a.kind], x: a.x, z: a.z, reach: a.reach }));
  for (const a of avatars) {
    if (a.interactable) targets.push({ action: { kind: 'agent', id: a.agent.id }, x: a.x, z: a.z, reach: DESK_REACH });
  }
  return targets;
}

/**
 * The click dispatch: pick the target the player is *looking at* — within its
 * reach and inside a cone around the camera's forward direction `(dirX, dirZ)`.
 * Ties break toward the one most directly ahead + closest. `minCos` is the cosine
 * of the half-angle of the aim cone (default ≈ cos 35°).
 */
export function raycastPick(
  px: number,
  pz: number,
  dirX: number,
  dirZ: number,
  targets: readonly Target[],
  minCos = 0.82,
): InteractionAction {
  const len = Math.hypot(dirX, dirZ);
  if (len < 1e-6) return null;
  const fx = dirX / len;
  const fz = dirZ / len;
  let best = Infinity;
  let hit: InteractionAction = null;
  for (const t of targets) {
    const vx = t.x - px;
    const vz = t.z - pz;
    const dist = Math.hypot(vx, vz);
    if (dist > t.reach) continue;
    if (dist < 1e-4) return t.action; // standing on it
    const cos = (vx * fx + vz * fz) / dist;
    if (cos < minCos) continue;
    const score = dist * (2 - cos); // nearer + more-centred wins
    if (score < best) {
      best = score;
      hit = t.action;
    }
  }
  return hit;
}

/** The store methods the dispatcher drives — the panel-open contract. */
export interface InteractionStore {
  openBoard(): void;
  toggleBreak(): void;
  openLibrary(): void;
  /**
   * In the 3D office the console leads into the immersive arcade room (Theme D),
   * rather than opening the RetroGamesMenu modal like 2D does — so the
   * `playstation` action enters the arcade. The stub cabinets *inside* the arcade
   * open the menu directly (they don't go through this dispatcher).
   */
  enterArcade(): void;
  open(id: string): void;
}

/**
 * Apply a resolved interaction to the store — the same transitions 2D
 * `tryInteract` performs (except the console, which enters the 3D arcade room).
 * Kept pure over an `InteractionStore` so the store-contract test can assert
 * parity without a real scene.
 */
export function applyInteraction(action: InteractionAction, store: InteractionStore): void {
  if (!action) return;
  switch (action.kind) {
    case 'board':
      store.openBoard();
      return;
    case 'break':
      store.toggleBreak();
      return;
    case 'library':
      store.openLibrary();
      return;
    case 'playstation':
      store.enterArcade();
      return;
    case 'agent':
      store.open(action.id);
      return;
  }
}
