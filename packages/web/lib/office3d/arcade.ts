/**
 * Phase 63 Theme D — the arcade sub-scene, pure. A small dark room reached from
 * the lounge console (`currentScene === 'arcade'`): a back-wall row of glowing
 * cabinets (one playable **Breakout**, the rest stubs that open the existing
 * `RetroGamesMenu`) and an exit back to the office. `three`-free — the r3f
 * `<ArcadeScene>` turns this model into meshes, and the collision grid feeds the
 * same `resolveMove` the office rig uses, so the geometry stays unit-testable.
 */

import { EYE_HEIGHT, WALL_HEIGHT, tileToWorld } from './constants';
import type { Placement } from './world';

export const ARCADE_COLS = 20;
export const ARCADE_ROWS = 10;

export type ArcadeCabinetKind = 'breakout' | 'stub';

/** A single cabinet in the back-wall row. */
export interface ArcadeCabinet {
  id: string;
  kind: ArcadeCabinetKind;
  /** Marquee label above the screen. */
  label: string;
  /** World-space centre (units). */
  x: number;
  z: number;
  /** Yaw (radians) — cabinets face +z, toward the player entrance. */
  rotationY: number;
}

/** A wall segment (perimeter box), same shape the world builder emits. */
export interface ArcadeWall extends Placement {
  horizontal: boolean;
}

export interface ArcadeModel {
  cols: number;
  rows: number;
  /** Collision grid (true = wall/cabinet) for `resolveMove`. */
  blocked: boolean[][];
  floor: { x: number; z: number; w: number; d: number };
  walls: ArcadeWall[];
  cabinets: ArcadeCabinet[];
  /** Exit spot (walk up + E → back to the office), at the entrance. */
  exit: { x: number; z: number };
  spawn: { x: number; y: number; z: number };
}

/** Marquee labels — Breakout (playable) + the 8 RetroGamesMenu titles (stubs). */
const STUB_LABELS = [
  'PAC-MAN',
  'TETRIS',
  'SPACE INVADERS',
  'DONKEY KONG',
  'PONG',
  'FROGGER',
  'GALAGA',
  'STREET FIGHTER II',
] as const;

/** Cabinet tile row (just below the back wall) + the first/last playable columns. */
const CABINET_ROW = 1;
const CABINET_FIRST_COL = 2;
const CABINET_STEP = 2;

/**
 * Build the arcade room model. Deterministic + pure, so the unit tests assert
 * exact cabinet count/positions, full perimeter walls, and a clear spawn.
 */
export function buildArcade(): ArcadeModel {
  const cols = ARCADE_COLS;
  const rows = ARCADE_ROWS;

  // Collision grid: solid border, open interior.
  const blocked: boolean[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => x === 0 || y === 0 || x === cols - 1 || y === rows - 1),
  );

  // Cabinets: Breakout in the centre of the row, stubs flanking it.
  const count = STUB_LABELS.length + 1;
  const centreIndex = Math.floor(count / 2);
  const cabinets: ArcadeCabinet[] = [];
  let stub = 0;
  for (let i = 0; i < count; i++) {
    const tileX = CABINET_FIRST_COL + i * CABINET_STEP;
    const { x, z } = tileToWorld(tileX, CABINET_ROW);
    if (i === centreIndex) {
      cabinets.push({ id: 'breakout', kind: 'breakout', label: 'BREAKOUT', x, z, rotationY: 0 });
    } else {
      cabinets.push({ id: `stub-${stub}`, kind: 'stub', label: STUB_LABELS[stub]!, x, z, rotationY: 0 });
      stub++;
    }
    blocked[CABINET_ROW]![tileX] = true;
  }

  // Perimeter walls as four boxes (centre + full span each side).
  const wall = (x: number, z: number, w: number, d: number, horizontal: boolean): ArcadeWall => ({
    x,
    z,
    w,
    d,
    h: WALL_HEIGHT,
    cy: WALL_HEIGHT / 2,
    horizontal,
  });
  const walls: ArcadeWall[] = [
    wall(cols / 2, 0.5, cols, 1, true), // back (north)
    wall(cols / 2, rows - 0.5, cols, 1, true), // front (south)
    wall(0.5, rows / 2, 1, rows, false), // west
    wall(cols - 0.5, rows / 2, 1, rows, false), // east
  ];

  const floor = { x: cols / 2, z: rows / 2, w: cols, d: rows };

  // Player enters at the bottom-centre, facing the cabinets (north, −z).
  const spawnTile = tileToWorld(Math.floor(cols / 2), rows - 2);
  const exitTile = tileToWorld(Math.floor(cols / 2), rows - 1);

  return {
    cols,
    rows,
    blocked,
    floor,
    walls,
    cabinets,
    exit: { x: exitTile.x, z: exitTile.z },
    spawn: { x: spawnTile.x, y: EYE_HEIGHT, z: spawnTile.z },
  };
}
