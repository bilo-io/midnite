/**
 * Procedural pixel-art for the office (Phase 8). Sprites + tiles are generated in
 * code rather than loaded from an external pack — deterministic, themeable (tiles
 * drawn neutral and tinted to the live palette), and zero-licensing.
 *
 * Two character kinds: a **human** player and **robot** agents (each session is an
 * AI, so the desk/lounge occupants are little robots). Plus office furniture for
 * the three zones — hot desks (work), a lounge (TV + console + couches), and a
 * board room (conference table + a documents whiteboard).
 *
 * `ensureOfficeTextures`/`ensureOfficeAnims` are idempotent (guarded by exists())
 * so a StrictMode/HMR remount can't double-register a key.
 */

import type Phaser from 'phaser';

import type { PlantVariant } from './layout';

export const TEX = {
  floor: 'office-floor',
  wall: 'office-wall',
  desk: 'office-desk',
  monitor: 'office-monitor',
  chair: 'office-chair',
  couch: 'office-couch',
  armchair: 'office-armchair',
  tv: 'office-tv',
  console: 'office-console',
  table: 'office-table',
  board: 'office-board',
  plant: 'office-plant',
  coffee: 'office-coffee',
  counter: 'office-counter',
  stool: 'office-stool',
  bookshelf: 'office-bookshelf',
  door: 'office-door',
  water: 'office-water',
  lounger: 'office-lounger',
  plantPalm: 'office-plant-palm',
  plantSucculent: 'office-plant-succulent',
  wallArt: 'office-wall-art',
  rug: 'office-rug',
  astroTurf: 'office-astro-turf',
  // Desk clutter (E3) — small items scattered on the hot desks for life.
  paperStack: 'office-paper-stack',
  deskMug: 'office-desk-mug',
  deskPlantlet: 'office-desk-plantlet',
  // Communal games corner (E3).
  poolTable: 'office-pool-table',
  pingPong: 'office-ping-pong',
  gameTable: 'office-game-table',
  controller: 'office-controller',
} as const;

/** Texture key for a plant species/size (Phase 9 B2). */
export const plantTexture = (variant: PlantVariant): string =>
  variant === 'palm' ? TEX.plantPalm : variant === 'succulent' ? TEX.plantSucculent : TEX.plant;

export type Dir = 'down' | 'up' | 'side';
export type CharKind = 'human' | 'robot';

/** Native (unscaled) character sprite size, in px. */
export const CHAR_W = 16;
export const CHAR_H = 20;

// Keys carry a variant segment (`v0`, `v1`, …). The human player is always `v0`;
// agent robots pick a variant by id (see `robotVariant`) so a deskful of agents
// are visually distinct, not just tinted.
export const charKey = (kind: CharKind, dir: Dir, frame: 0 | 1, variant = 0) =>
  `office-${kind}-v${variant}-${dir}-${frame}`;
export const walkAnim = (kind: CharKind, dir: Dir, variant = 0) => `office-walk-${kind}-v${variant}-${dir}`;

// Human pixel palette. Drawn mostly light (cloth = white) so a per-sprite tint
// colours the clothing; dark parts (outline, hair, boots) survive the multiply.
const C: Record<string, number> = {
  ' ': -1,
  O: 0x1f2430, // outline / eyes
  H: 0x3a2a1a, // hair
  S: 0xe7c19b, // skin
  C: 0xf5f5f5, // cloth (tintable)
  P: 0x3f4756, // pants
  B: 0x222733, // boots
};

const HUMAN_TORSO: Record<Dir, string[]> = {
  down: [
    '      HHHH      ',
    '     HHHHHH     ',
    '    HHSSSSHH    ',
    '    HSSSSSSH    ',
    '    HSSSSSSH    ',
    '    SSOSSOSS    ',
    '    SSSSSSSS    ',
    '     SSSSSS     ',
    '      SSSS      ',
    '     CCCCCC     ',
    '    CCCCCCCC    ',
    '   CCCCCCCCCC   ',
    '   CC CCCC CC   ',
    '    CCCCCCCC    ',
    '    CCCCCCCC    ',
    '    PPPPPPPP    ',
  ],
  up: [
    '      HHHH      ',
    '     HHHHHH     ',
    '    HHHHHHHH    ',
    '    HHHHHHHH    ',
    '    HHHHHHHH    ',
    '    HHHHHHHH    ',
    '    HHHHHHHH    ',
    '     SSSSSS     ',
    '      SSSS      ',
    '     CCCCCC     ',
    '    CCCCCCCC    ',
    '   CCCCCCCCCC   ',
    '   CC CCCC CC   ',
    '    CCCCCCCC    ',
    '    CCCCCCCC    ',
    '    PPPPPPPP    ',
  ],
  side: [
    '      HHHH      ',
    '     HHHHHH     ',
    '    HHSSSSSH    ',
    '    HSSSSSSS    ',
    '    HSSSSSSS    ',
    '    SSSSSOSS    ',
    '    SSSSSSSS    ',
    '     SSSSSS     ',
    '      SSSS      ',
    '     CCCCCC     ',
    '    CCCCCCCC    ',
    '   CCCCCCCCCC   ',
    '   CCCCCCCC C   ',
    '    CCCCCCCC    ',
    '    CCCCCCCC    ',
    '    PPPPPPPP    ',
  ],
};

const HUMAN_LEGS: Record<0 | 1, string[]> = {
  0: ['    PPP  PPP    ', '    PPP  PPP    ', '    BBB  BBB    ', '    BBB  BBB    '],
  1: ['     PPPPPP     ', '     PPPPPP     ', '     BBBBBB     ', '      BBBB      '],
};

// Robot palette. Chassis is light metal (tintable for per-agent variety); the
// visor/eye/light are bright accents and the joints stay dark.
const R = {
  metal: 0xe2e6ec,
  dark: 0x2b313c,
  panel: 0x9aa3b2,
  visor: 0x10141c,
  eye: 0x67e8f9,
  light: 0x34d399,
  ant: 0xf87171,
} as const;

/**
 * Per-agent robot variety. Each agent's robot picks one spec by a hash of its id,
 * so a roomful of agents differ in **silhouette** (antenna shape, side fins) and
 * **accent/eye/visor colours** — on top of the per-agent chassis {@link agentTint}.
 * Chassis metal stays light so the tint still reads. This array is the **seam an
 * external character pack swaps in at**: one spec → one sprite sheet, keys unchanged.
 */
export type RobotAntenna = 'rod' | 'twin' | 'bulb' | 'dish' | 'none';
export interface RobotVariantSpec {
  antenna: RobotAntenna;
  eye: number;
  accent: number;
  visor: number;
  fins: boolean;
}

export const ROBOT_VARIANTS: readonly RobotVariantSpec[] = [
  { antenna: 'rod', eye: 0x67e8f9, accent: 0x34d399, visor: 0x10141c, fins: false },
  { antenna: 'twin', eye: 0xfbbf24, accent: 0xf472b6, visor: 0x10141c, fins: true },
  { antenna: 'bulb', eye: 0xe879f9, accent: 0x38bdf8, visor: 0x0b1220, fins: false },
  { antenna: 'dish', eye: 0x4ade80, accent: 0xfb923c, visor: 0x10141c, fins: true },
  { antenna: 'none', eye: 0xf8fafc, accent: 0xa78bfa, visor: 0x0b1220, fins: false },
  { antenna: 'twin', eye: 0xf87171, accent: 0x2dd4bf, visor: 0x10141c, fins: true },
];

/** Deterministic robot design index for an agent id. Uses a different multiplier
 *  to {@link agentTint} so shape and chassis colour aren't perfectly correlated. */
export function robotVariant(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return hash % ROBOT_VARIANTS.length;
}

function drawGrid(g: Phaser.GameObjects.Graphics, rows: string[]) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = C[row[x]!];
      if (color === undefined || color < 0) continue;
      g.fillStyle(color, 1).fillRect(x, y, 1, 1);
    }
  });
}

function rect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
  g.fillStyle(color, 1).fillRect(x, y, w, h);
}

/** A boxy robot, 16×20, facing `dir`, walk `frame`, styled by `spec`. */
function drawRobot(g: Phaser.GameObjects.Graphics, dir: Dir, frame: 0 | 1, spec: RobotVariantSpec) {
  const { antenna, eye, accent, visor, fins } = spec;
  // Antenna (silhouette varies by variant)
  if (antenna === 'rod') {
    rect(g, 8, 0, 1, 3, R.dark);
    rect(g, 7, 0, 2, 2, accent);
  } else if (antenna === 'twin') {
    rect(g, 6, 0, 1, 3, R.dark);
    rect(g, 10, 0, 1, 3, R.dark);
    rect(g, 6, 0, 1, 1, accent);
    rect(g, 10, 0, 1, 1, accent);
  } else if (antenna === 'bulb') {
    rect(g, 8, 1, 1, 2, R.dark);
    rect(g, 7, 0, 3, 2, accent);
  } else if (antenna === 'dish') {
    rect(g, 8, 1, 1, 2, R.dark);
    rect(g, 6, 0, 5, 1, R.panel);
    rect(g, 7, 0, 3, 1, accent);
  } else {
    // none → a flush sensor bar
    rect(g, 5, 2, 6, 1, R.panel);
    rect(g, 7, 2, 2, 1, accent);
  }
  // Head (dark outline + metal fill)
  rect(g, 4, 3, 8, 7, R.dark);
  rect(g, 5, 4, 6, 5, R.metal);
  // Side fins (variant) or plain bolts
  if (fins) {
    rect(g, 3, 5, 1, 3, R.panel);
    rect(g, 12, 5, 1, 3, R.panel);
  }
  rect(g, 4, 6, 1, 2, R.dark);
  rect(g, 11, 6, 1, 2, R.dark);
  // Visor
  rect(g, 5, 5, 6, 3, visor);
  // Eyes by facing
  if (dir === 'down') {
    rect(g, 6, 6, 1, 1, eye);
    rect(g, 9, 6, 1, 1, eye);
  } else if (dir === 'side') {
    rect(g, 9, 6, 1, 1, eye);
  }
  // Neck
  rect(g, 7, 10, 2, 1, R.dark);
  // Torso
  rect(g, 3, 11, 10, 6, R.dark);
  rect(g, 4, 12, 8, 4, R.metal);
  // Chest panel + status light (accent)
  rect(g, 6, 12, 4, 3, R.panel);
  rect(g, 7, 13, 1, 1, accent);
  // Arms
  rect(g, 2, 12, 2, 4, R.metal);
  rect(g, 12, 12, 2, 4, R.metal);
  // Legs (frame 0 apart, frame 1 together) + feet
  if (frame === 0) {
    rect(g, 5, 17, 2, 3, R.dark);
    rect(g, 9, 17, 2, 3, R.dark);
  } else {
    rect(g, 6, 17, 2, 3, R.dark);
    rect(g, 8, 17, 2, 3, R.dark);
  }
}

/** Generate all office textures once. Safe to call repeatedly. */
export function ensureOfficeTextures(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // --- Floor / walls (neutral grey → tinted to the theme) ---
  make(TEX.floor, 32, 32, (g) => {
    rect(g, 0, 0, 32, 32, 0x9c9c9c);
    rect(g, 0, 0, 32, 16, 0x979797);
    rect(g, 16, 16, 16, 16, 0x979797);
    g.fillStyle(0x848484, 1);
    g.fillRect(31, 0, 1, 32);
    g.fillRect(0, 31, 32, 1);
  });
  make(TEX.wall, 32, 32, (g) => {
    rect(g, 0, 0, 32, 32, 0xb4b4b4);
    g.fillStyle(0x8f8f8f, 1);
    for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 1);
    for (let y = 0; y < 32; y += 8) {
      const offset = (y / 8) % 2 === 0 ? 0 : 16;
      g.fillRect(offset, y, 1, 8);
      g.fillRect((offset + 16) % 32, y, 1, 8);
    }
  });

  // --- Desk workstation (wider top — E3) ---
  make(TEX.desk, 44, 22, (g) => {
    rect(g, 0, 0, 44, 22, 0x4a2e1a);
    rect(g, 1, 1, 42, 20, 0x8a5a34);
    rect(g, 1, 1, 42, 5, 0x9c6a40);
    g.fillStyle(0x6e4526, 1);
    for (let x = 4; x < 42; x += 6) g.fillRect(x, 7, 1, 13);
  });
  // Desk clutter (E3) — a stack of papers, a coffee mug, a tiny desk plant.
  make(TEX.paperStack, 10, 8, (g) => {
    rect(g, 1, 5, 9, 3, 0xcbd5e1); // bottom sheet (shadow)
    rect(g, 0, 3, 9, 3, 0xf1f5f9); // middle sheet
    rect(g, 1, 1, 9, 3, 0xffffff); // top sheet
    rect(g, 2, 2, 6, 1, 0x94a3b8); // text line
  });
  make(TEX.deskMug, 8, 8, (g) => {
    rect(g, 1, 1, 5, 6, 0xdc2626); // mug body
    rect(g, 1, 1, 5, 1, 0xef4444); // rim highlight
    rect(g, 6, 2, 2, 4, 0xdc2626); // handle
    rect(g, 2, 2, 3, 1, 0x3a2a1a); // coffee surface
  });
  make(TEX.deskPlantlet, 8, 10, (g) => {
    rect(g, 2, 6, 4, 4, 0x9c6a40); // pot
    rect(g, 1, 5, 6, 2, 0x6e4526); // pot rim
    rect(g, 3, 2, 2, 4, 0x4d8c4d); // stem
    rect(g, 1, 2, 3, 3, 0x5b9b5b); // leaves
    rect(g, 4, 2, 3, 3, 0x5b9b5b);
    rect(g, 3, 0, 2, 2, 0x6bbf6b);
  });
  make(TEX.monitor, 18, 14, (g) => {
    rect(g, 0, 0, 18, 12, 0x0f172a);
    rect(g, 2, 2, 14, 8, 0x1e3a5f);
    rect(g, 2, 2, 14, 2, 0x38bdf8);
    rect(g, 7, 12, 4, 2, 0x334155);
  });
  make(TEX.chair, 16, 12, (g) => {
    rect(g, 2, 0, 12, 3, 0x475569);
    rect(g, 1, 4, 14, 6, 0x334155);
  });

  // --- Lounge ---
  make(TEX.couch, 56, 26, (g) => {
    rect(g, 0, 0, 56, 26, 0x3f4754); // frame
    rect(g, 4, 4, 48, 8, 0x64748b); // backrest
    rect(g, 2, 10, 52, 14, 0x55617a); // seat base
    rect(g, 4, 12, 22, 10, 0x6b7794); // cushion L
    rect(g, 30, 12, 22, 10, 0x6b7794); // cushion R
    rect(g, 0, 2, 6, 24, 0x3a4150); // armrest L
    rect(g, 50, 2, 6, 24, 0x3a4150); // armrest R
  });
  make(TEX.armchair, 26, 24, (g) => {
    rect(g, 0, 0, 26, 24, 0x3f4754);
    rect(g, 3, 3, 20, 7, 0x64748b);
    rect(g, 2, 9, 22, 13, 0x6b7794);
    rect(g, 0, 2, 5, 22, 0x3a4150);
    rect(g, 21, 2, 5, 22, 0x3a4150);
  });
  // Super-sized flatscreen (E3) — a big wall TV for the gaming corner.
  make(TEX.tv, 64, 44, (g) => {
    rect(g, 26, 38, 12, 4, 0x1f2937); // stand neck
    rect(g, 20, 41, 24, 3, 0x111827); // stand base
    rect(g, 1, 0, 62, 38, 0x0b0f17); // bezel
    rect(g, 3, 2, 58, 33, 0x14233f); // screen
    rect(g, 3, 2, 58, 5, 0x38bdf8); // glow bar
    rect(g, 8, 12, 22, 18, 0x1e3a5f); // picture block (left)
    rect(g, 34, 12, 22, 18, 0x24507a); // picture block (right)
    rect(g, 8, 12, 48, 2, 0x2c5d8a); // scanline highlight
  });
  // White PS5-style console (E3) — twin white fins, black core, blue light strip.
  make(TEX.console, 26, 16, (g) => {
    rect(g, 9, 1, 8, 14, 0x0b0f17); // black core
    rect(g, 2, 0, 7, 16, 0xf5f5f7); // left fin
    rect(g, 17, 0, 7, 16, 0xf5f5f7); // right fin
    rect(g, 2, 0, 7, 2, 0xe2e6ec); // fin bevel highlights
    rect(g, 17, 0, 7, 2, 0xe2e6ec);
    rect(g, 8, 0, 1, 16, 0xcbd5e1); // inner seams
    rect(g, 17, 0, 1, 16, 0xcbd5e1);
    rect(g, 12, 2, 2, 12, 0x38bdf8); // blue light strip
    rect(g, 12, 2, 2, 3, 0x7dd3fc); // brighter strip top
    rect(g, 10, 12, 6, 1, 0x1f2937); // disc slot
    rect(g, 10, 4, 1, 1, 0x9aa3b2); // power button
    rect(g, 15, 4, 1, 1, 0x9aa3b2); // eject button
  });
  // Low gaming/coffee table — holds the controllers in front of the couches (E3).
  make(TEX.gameTable, 28, 18, (g) => {
    rect(g, 0, 2, 28, 14, 0x3f2f22); // frame edge
    rect(g, 2, 4, 24, 10, 0x6b4f3a); // table top
    rect(g, 2, 4, 24, 2, 0x7c5a42); // top highlight
    rect(g, 3, 16, 3, 2, 0x2a1f16); // legs
    rect(g, 22, 16, 3, 2, 0x2a1f16);
  });
  // Tiny gamepad (E3) — body + grips + stick/buttons + touchpad.
  make(TEX.controller, 10, 8, (g) => {
    rect(g, 1, 2, 8, 4, 0x2b313c); // body
    rect(g, 0, 3, 2, 4, 0x2b313c); // left grip
    rect(g, 8, 3, 2, 4, 0x2b313c); // right grip
    rect(g, 2, 3, 1, 1, 0x67e8f9); // left stick
    rect(g, 7, 3, 1, 1, 0xf472b6); // right buttons
    rect(g, 4, 2, 2, 1, 0x9aa3b2); // touchpad
  });

  // --- Board room ---
  make(TEX.table, 148, 92, (g) => {
    rect(g, 0, 6, 148, 80, 0x3f2f22); // outline
    rect(g, 3, 9, 142, 74, 0x6b4f3a); // top
    rect(g, 3, 9, 142, 10, 0x7c5a42); // highlight
    g.fillStyle(0x5a4230, 1);
    for (let x = 14; x < 140; x += 16) g.fillRect(x, 22, 1, 58); // grain
  });
  make(TEX.board, 54, 40, (g) => {
    rect(g, 0, 0, 54, 40, 0x3f2f22); // frame
    rect(g, 3, 3, 48, 34, 0xf8fafc); // surface
    rect(g, 7, 7, 24, 3, 0x64748b); // title line
    g.fillStyle(0x94a3b8, 1);
    for (let i = 0; i < 4; i++) g.fillRect(7, 15 + i * 5, 40 - i * 4, 1); // text lines
  });
  make(TEX.coffee, 20, 26, (g) => {
    rect(g, 1, 14, 18, 12, 0x3a4150); // counter cabinet
    rect(g, 1, 14, 18, 2, 0x4b5563); // counter top
    rect(g, 3, 2, 14, 11, 0x1f2937); // machine body
    rect(g, 5, 4, 10, 4, 0x111827); // display
    rect(g, 6, 5, 3, 1, 0x34d399); // ready light
    rect(g, 8, 9, 4, 3, 0x6b4f3a); // mug
    rect(g, 9, 11, 6, 1, 0x0b0f17); // drip
  });
  make(TEX.counter, 30, 22, (g) => {
    rect(g, 0, 6, 30, 16, 0x3a4150); // cabinet
    rect(g, 0, 4, 30, 4, 0x4b5563); // counter top
    rect(g, 2, 12, 11, 8, 0x2b313c); // left door
    rect(g, 15, 12, 11, 8, 0x2b313c); // right door
    rect(g, 11, 15, 2, 2, 0x9aa3b2); // left handle
    rect(g, 17, 15, 2, 2, 0x9aa3b2); // right handle
    rect(g, 20, 1, 7, 4, 0x9ca3af); // sink basin
    rect(g, 23, 0, 1, 3, 0xcbd5e1); // tap
  });
  make(TEX.stool, 12, 16, (g) => {
    rect(g, 1, 3, 10, 4, 0x6b4f3a); // seat
    rect(g, 1, 3, 10, 1, 0x8a6a4a); // seat highlight
    rect(g, 2, 7, 2, 8, 0x3f4756); // legs
    rect(g, 8, 7, 2, 8, 0x3f4756);
    rect(g, 2, 10, 8, 1, 0x3f4756); // cross-bar
  });
  make(TEX.bookshelf, 28, 32, (g) => {
    rect(g, 0, 0, 28, 32, 0x5a4230); // wood frame
    rect(g, 2, 2, 24, 28, 0x3a2a1a); // dark interior
    for (let s = 0; s < 4; s++) {
      const y = 3 + s * 7;
      rect(g, 2, y + 6, 24, 1, 0x5a4230); // shelf board
      // a row of book spines, alternating colours
      const spines = [0xb45309, 0x166534, 0x7c3aed, 0x9f1239, 0x1d4ed8, 0xca8a04];
      for (let b = 0; b < 6; b++) rect(g, 3 + b * 4, y, 3, 6, spines[(s + b) % spines.length]!);
    }
  });
  make(TEX.door, 24, 30, (g) => {
    rect(g, 0, 0, 24, 30, 0x3f2f22); // frame
    rect(g, 3, 2, 18, 28, 0x6b4f3a); // door slab
    rect(g, 5, 5, 6, 9, 0x5a4230); // upper panel
    rect(g, 13, 5, 6, 9, 0x5a4230);
    rect(g, 5, 16, 6, 11, 0x5a4230); // lower panel
    rect(g, 13, 16, 6, 11, 0x5a4230);
    rect(g, 16, 14, 2, 3, 0xfacc15); // handle
  });
  make(TEX.plant, 18, 24, (g) => {
    rect(g, 6, 16, 6, 8, 0x6b4f3a); // pot
    rect(g, 5, 20, 8, 2, 0x4a2e1a);
    g.fillStyle(0x4d7c4d, 1);
    rect(g, 7, 4, 4, 12, 0x4d7c4d); // stem area
    rect(g, 3, 6, 5, 6, 0x5b9b5b); // leaves
    rect(g, 10, 6, 5, 6, 0x5b9b5b);
    rect(g, 6, 2, 6, 5, 0x6bbf6b);
  });
  // Tall palm — a slimmer pot, a long trunk and a fan of fronds up top (B2).
  make(TEX.plantPalm, 18, 32, (g) => {
    rect(g, 6, 26, 6, 6, 0x8a5a34); // pot
    rect(g, 5, 24, 8, 2, 0x5a3a1f);
    rect(g, 8, 10, 2, 16, 0x7a5a3a); // trunk
    rect(g, 1, 11, 6, 2, 0x3f7d3f); // fronds (drooping)
    rect(g, 11, 11, 6, 2, 0x3f7d3f);
    rect(g, 2, 7, 5, 2, 0x4d8c4d);
    rect(g, 11, 7, 5, 2, 0x4d8c4d);
    rect(g, 6, 3, 6, 4, 0x6bbf6b); // crown
    rect(g, 4, 5, 10, 2, 0x5b9b5b);
  });
  // Small succulent — a squat pot on the floor, a tuft of leaves (B2).
  make(TEX.plantSucculent, 14, 14, (g) => {
    rect(g, 4, 8, 6, 6, 0x9c6a40); // pot
    rect(g, 3, 7, 8, 2, 0x6e4526);
    rect(g, 5, 2, 4, 6, 0x5b9b5b); // central rosette
    rect(g, 2, 5, 3, 3, 0x4d8c4d);
    rect(g, 9, 5, 3, 3, 0x4d8c4d);
    rect(g, 5, 1, 4, 2, 0x6bbf6b);
  });
  // Framed wall art — a small landscape behind a wooden frame (B2).
  make(TEX.wallArt, 20, 15, (g) => {
    rect(g, 0, 0, 20, 15, 0x4a2e1a); // frame
    rect(g, 1, 1, 18, 1, 0x8a5a34); // top bevel highlight
    rect(g, 2, 2, 16, 11, 0x2f4a6a); // sky
    rect(g, 2, 9, 16, 4, 0x3f7d3f); // hills
    rect(g, 14, 4, 3, 3, 0xfacc15); // sun
    rect(g, 4, 7, 6, 2, 0x5b8c6b); // ridge
  });
  // Area rug — a warm woven rug with a bordered field + centre motif (B2).
  make(TEX.rug, 46, 32, (g) => {
    rect(g, 0, 0, 46, 32, 0x5a3636); // dark border
    rect(g, 3, 3, 40, 26, 0x8a4f4f); // field
    rect(g, 7, 6, 32, 20, 0x9c6a6a); // inner field
    rect(g, 18, 12, 10, 8, 0xc89b9b); // centre motif
    rect(g, 21, 14, 4, 4, 0x8a4f4f);
  });
  // Seamless astro-turf tile — bright green with light/dark blades (B2/E2 communal).
  make(TEX.astroTurf, 32, 32, (g) => {
    rect(g, 0, 0, 32, 32, 0x3da35a); // turf base
    g.fillStyle(0x2f8a4a, 1); // darker blades
    for (let y = 0; y < 32; y += 4) for (let x = (y / 4) % 2 ? 0 : 2; x < 32; x += 4) g.fillRect(x, y, 1, 3);
    g.fillStyle(0x57c777, 1); // light blade highlights
    for (let y = 2; y < 32; y += 6) for (let x = 1; x < 32; x += 6) g.fillRect(x, y, 1, 2);
  });
  // Seamless water tile — scrolled in update() for a gentle shimmer.
  make(TEX.water, 32, 32, (g) => {
    rect(g, 0, 0, 32, 32, 0x2a9fc4); // base aqua
    g.fillStyle(0x3fb6d8, 1); // lighter band
    rect(g, 0, 4, 32, 3, 0x3fb6d8);
    rect(g, 0, 18, 32, 3, 0x3fb6d8);
    g.fillStyle(0x7fd6ea, 0.9); // ripple highlights
    rect(g, 4, 10, 8, 1, 0x7fd6ea);
    rect(g, 20, 24, 8, 1, 0x7fd6ea);
    rect(g, 14, 2, 6, 1, 0x7fd6ea);
  });
  // Sun lounger / deck chair (faces down toward the pool).
  make(TEX.lounger, 18, 22, (g) => {
    rect(g, 2, 16, 14, 3, 0x6b7280); // frame base
    rect(g, 3, 4, 12, 12, 0xf4f4f5); // reclined cushion
    rect(g, 3, 4, 12, 2, 0xe2e8f0); // headrest
    g.fillStyle(0x60a5fa, 1); // towel stripe
    rect(g, 3, 9, 12, 3, 0x60a5fa);
    rect(g, 3, 17, 2, 4, 0x6b7280); // legs
    rect(g, 13, 17, 2, 4, 0x6b7280);
  });

  // --- Communal games corner (E3): a pool table + a ping-pong table (3×2 tiles) ---
  make(TEX.poolTable, 96, 64, (g) => {
    rect(g, 0, 0, 96, 64, 0x2a1f16); // dark outer edge
    rect(g, 3, 3, 90, 58, 0x6b4f3a); // wood rail
    rect(g, 4, 4, 88, 56, 0x7c5a42); // rail highlight
    rect(g, 10, 10, 76, 44, 0x15803d); // green felt
    rect(g, 10, 10, 76, 2, 0x16a34a); // felt top sheen
    g.fillStyle(0x0b0f17, 1); // six pockets
    g.fillRect(7, 7, 7, 7);
    g.fillRect(82, 7, 7, 7);
    g.fillRect(7, 50, 7, 7);
    g.fillRect(82, 50, 7, 7);
    g.fillRect(45, 6, 7, 7);
    g.fillRect(45, 51, 7, 7);
    rect(g, 30, 28, 5, 5, 0xfacc15); // balls
    rect(g, 38, 23, 5, 5, 0xdc2626);
    rect(g, 38, 33, 5, 5, 0x2563eb);
    rect(g, 58, 30, 5, 5, 0xf8fafc); // cue ball
    rect(g, 20, 40, 56, 2, 0xb45309); // cue stick
  });
  make(TEX.pingPong, 96, 64, (g) => {
    rect(g, 4, 6, 88, 52, 0x14235a); // table edge
    rect(g, 6, 8, 84, 48, 0x1d4ed8); // blue surface
    rect(g, 6, 8, 84, 2, 0x3b82f6); // top sheen
    g.fillStyle(0xf8fafc, 1); // white boundary + centre lines
    g.fillRect(6, 8, 84, 1);
    g.fillRect(6, 55, 84, 1);
    g.fillRect(6, 8, 1, 48);
    g.fillRect(89, 8, 1, 48);
    g.fillRect(6, 31, 84, 1); // long centre line
    g.fillStyle(0xcbd5e1, 0.85); // net across the middle
    g.fillRect(46, 4, 4, 56);
    rect(g, 47, 2, 2, 60, 0xe5e7eb); // net tape
    rect(g, 68, 24, 9, 9, 0xb91c1c); // paddle head
    rect(g, 74, 31, 5, 2, 0x6b4f3a); // paddle handle
    rect(g, 28, 30, 3, 3, 0xfef08a); // ball
  });

  // --- Characters: human (player, v0) + robot (agents, one sheet per variant) ---
  (['down', 'up', 'side'] as Dir[]).forEach((dir) => {
    ([0, 1] as const).forEach((frame) => {
      make(charKey('human', dir, frame), CHAR_W, CHAR_H, (g) =>
        drawGrid(g, [...HUMAN_TORSO[dir], ...HUMAN_LEGS[frame]]),
      );
      ROBOT_VARIANTS.forEach((spec, v) =>
        make(charKey('robot', dir, frame, v), CHAR_W, CHAR_H, (g) => drawRobot(g, dir, frame, spec)),
      );
    });
  });
}

/** Register the walk-cycle animations once. Safe to call repeatedly. */
export function ensureOfficeAnims(scene: Phaser.Scene): void {
  const reg = (key: string, kind: CharKind, dir: Dir, variant: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: [{ key: charKey(kind, dir, 0, variant) }, { key: charKey(kind, dir, 1, variant) }],
      frameRate: 6,
      repeat: -1,
    });
  };
  (['down', 'up', 'side'] as Dir[]).forEach((dir) => {
    reg(walkAnim('human', dir), 'human', dir, 0);
    ROBOT_VARIANTS.forEach((_, v) => reg(walkAnim('robot', dir, v), 'robot', dir, v));
  });
}

// Soft, distinct identity tints so desks/couches are distinguishable at a glance.
const IDENTITY_TINTS = [
  0xf9a8d4, 0xa5b4fc, 0x86efac, 0xfcd34d, 0xfca5a5, 0x67e8f9, 0xc4b5fd, 0xfdba74,
] as const;

/** Deterministic identity tint for an agent id (stable across refetches). */
export function agentTint(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return IDENTITY_TINTS[hash % IDENTITY_TINTS.length]!;
}
