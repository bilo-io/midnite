/**
 * Office grid dimensions — the single source of truth for the room size and tile
 * size. Lives in its own Phaser-free module so the React wrapper/loading shell
 * (office-view.tsx) can derive the canvas aspect ratio without pulling Phaser
 * (and the whole office-scene chunk) into the eager bundle.
 */

export const OFFICE_TILE = 32;
export const OFFICE_COLS = 34;
export const OFFICE_ROWS = 22;

/** Canvas aspect ratio (width / height), e.g. for a CSS `aspect-ratio` box. */
export const OFFICE_ASPECT = `${OFFICE_COLS} / ${OFFICE_ROWS}`;
