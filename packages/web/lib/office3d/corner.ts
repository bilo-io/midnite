/**
 * Phase 63 Theme E — the corner-office sub-scene, pure. A small private room
 * reached through the office door (`currentScene === 'corner'`): a personal desk
 * (with slots for the player's chosen desk items), a window for light, and an exit
 * back to the office. Mirrors the 2D
 * [`corner-office-scene.ts`](../../components/office/scenes/corner-office-scene.ts)
 * mechanics (`nearDoor` / `openDeskPicker`). `three`-free — the r3f
 * `<CornerScene>` renders the model and the collision grid feeds the same
 * `resolveMove` the sub-scene rig uses.
 */

import { EYE_HEIGHT, WALL_HEIGHT, tileToWorld } from './constants';
import type { Placement } from './world';

export const CORNER_COLS = 12;
export const CORNER_ROWS = 9;

/** Desk footprint (tiles) against the back wall. */
const DESK_TILE_X = 5; // left tile of the 2-wide desk
const DESK_TILE_Z = 1;

export interface CornerWall extends Placement {
  horizontal: boolean;
}

export interface CornerModel {
  cols: number;
  rows: number;
  blocked: boolean[][];
  floor: { x: number; z: number; w: number; d: number };
  walls: CornerWall[];
  desk: Placement;
  /** Three prop slots on the desktop (world units, y = desk height). */
  deskItemSlots: { x: number; y: number; z: number }[];
  /** Window on the back wall — the light source anchor. */
  window: { x: number; y: number; z: number };
  exit: { x: number; z: number };
  spawn: { x: number; y: number; z: number };
}

/**
 * Build the corner-office room model. Deterministic + pure, so the unit tests
 * assert the desk footprint, three item slots, a clear spawn, and an exit by the
 * front wall.
 */
export function buildCorner(): CornerModel {
  const cols = CORNER_COLS;
  const rows = CORNER_ROWS;

  const blocked: boolean[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => x === 0 || y === 0 || x === cols - 1 || y === rows - 1),
  );
  // Desk occupies two tiles against the back wall.
  blocked[DESK_TILE_Z]![DESK_TILE_X] = true;
  blocked[DESK_TILE_Z]![DESK_TILE_X + 1] = true;

  const deskH = 0.78;
  const deskCentre = tileToWorld(DESK_TILE_X, DESK_TILE_Z); // left tile centre
  const desk: Placement = {
    x: deskCentre.x + 0.5, // centre of the 2-wide desk
    z: deskCentre.z,
    w: 2.2,
    d: 0.9,
    h: deskH,
    cy: deskH / 2,
  };

  const deskItemSlots = [-0.6, 0, 0.6].map((dx) => ({ x: desk.x + dx, y: deskH, z: desk.z + 0.05 }));

  const wall = (x: number, z: number, w: number, d: number, horizontal: boolean): CornerWall => ({
    x,
    z,
    w,
    d,
    h: WALL_HEIGHT,
    cy: WALL_HEIGHT / 2,
    horizontal,
  });
  const walls: CornerWall[] = [
    wall(cols / 2, 0.5, cols, 1, true),
    wall(cols / 2, rows - 0.5, cols, 1, true),
    wall(0.5, rows / 2, 1, rows, false),
    wall(cols - 0.5, rows / 2, 1, rows, false),
  ];

  const floor = { x: cols / 2, z: rows / 2, w: cols, d: rows };
  const window = { x: cols - 1, y: 1.6, z: rows / 2 };

  const spawnTile = tileToWorld(Math.floor(cols / 2), rows - 2);
  const exitTile = tileToWorld(Math.floor(cols / 2), rows - 1);

  return {
    cols,
    rows,
    blocked,
    floor,
    walls,
    desk,
    deskItemSlots,
    window,
    exit: { x: exitTile.x, z: exitTile.z },
    spawn: { x: spawnTile.x, y: EYE_HEIGHT, z: spawnTile.z },
  };
}
