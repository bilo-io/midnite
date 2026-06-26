/**
 * Pure geometry for the office **minimap** (Phase 8 D2). Phaser-free: the scene
 * reads these to draw a small bottom-right overview of the whole 34×22 map —
 * room outlines, agent/player dots, and a rectangle showing the slice of the
 * map the (zoomed, player-following) camera is currently viewing.
 *
 * Everything works in three coordinate spaces:
 *   - **world px** — the Phaser world (tile × `OFFICE_TILE`); player/camera live here.
 *   - **minimap px** — the small overview; a uniform `scale` of world px.
 *   - content sits inside a padded panel, so minimap px are offset by `pad`.
 */

import { OFFICE_COLS, OFFICE_ROWS, OFFICE_TILE } from './dimensions';
import { ROOMS, type RoomId } from './layout';

export interface MinimapLayout {
  /** Minimap content size (px) — world aspect preserved inside the max box. */
  width: number;
  height: number;
  /** Minimap px per world px (uniform on both axes). */
  scale: number;
}

export interface MinimapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MinimapPoint {
  x: number;
  y: number;
}

/**
 * Fit the world (`cols × rows` tiles of `tile` px) into a `maxW × maxH` box,
 * preserving the world aspect ratio. The smaller axis ratio wins so the content
 * never overflows the box.
 */
export function minimapLayout(
  maxW: number,
  maxH: number,
  tile: number = OFFICE_TILE,
  cols: number = OFFICE_COLS,
  rows: number = OFFICE_ROWS,
): MinimapLayout {
  const worldW = cols * tile;
  const worldH = rows * tile;
  const scale = Math.min(maxW / worldW, maxH / worldH);
  return { width: worldW * scale, height: worldH * scale, scale };
}

/** Map a world-px point into padded minimap-px space. */
export function worldToMinimap(
  wx: number,
  wy: number,
  scale: number,
  pad = 0,
): MinimapPoint {
  return { x: wx * scale + pad, y: wy * scale + pad };
}

/** Map a world-px rect (e.g. the camera's `worldView`) into padded minimap px. */
export function worldRectToMinimap(
  rect: MinimapRect,
  scale: number,
  pad = 0,
): MinimapRect {
  return {
    x: rect.x * scale + pad,
    y: rect.y * scale + pad,
    w: rect.w * scale,
    h: rect.h * scale,
  };
}

/**
 * The six room interior rects (from `ROOMS`, in tiles) mapped to padded minimap
 * px, paired with their `RoomId` so the scene can tint each by its accent.
 */
export function minimapRooms(
  scale: number,
  pad = 0,
  tile: number = OFFICE_TILE,
): { id: RoomId; rect: MinimapRect }[] {
  return ROOMS.map((r) => ({
    id: r.id,
    rect: worldRectToMinimap(
      { x: r.x * tile, y: r.y * tile, w: r.w * tile, h: r.h * tile },
      scale,
      pad,
    ),
  }));
}
