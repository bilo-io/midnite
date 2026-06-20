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
} as const;

export type Dir = 'down' | 'up' | 'side';
export type CharKind = 'human' | 'robot';

/** Native (unscaled) character sprite size, in px. */
export const CHAR_W = 16;
export const CHAR_H = 20;

export const charKey = (kind: CharKind, dir: Dir, frame: 0 | 1) => `office-${kind}-${dir}-${frame}`;
export const walkAnim = (kind: CharKind, dir: Dir) => `office-walk-${kind}-${dir}`;

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

/** A boxy robot, 16×20, facing `dir`, walk `frame`. */
function drawRobot(g: Phaser.GameObjects.Graphics, dir: Dir, frame: 0 | 1) {
  // Antenna
  rect(g, 8, 0, 1, 3, R.dark);
  rect(g, 7, 0, 2, 2, R.ant);
  // Head (dark outline + metal fill)
  rect(g, 4, 3, 8, 7, R.dark);
  rect(g, 5, 4, 6, 5, R.metal);
  // Side bolts
  rect(g, 4, 6, 1, 2, R.dark);
  rect(g, 11, 6, 1, 2, R.dark);
  // Visor
  rect(g, 5, 5, 6, 3, R.visor);
  // Eyes by facing
  if (dir === 'down') {
    rect(g, 6, 6, 1, 1, R.eye);
    rect(g, 9, 6, 1, 1, R.eye);
  } else if (dir === 'side') {
    rect(g, 9, 6, 1, 1, R.eye);
  }
  // Neck
  rect(g, 7, 10, 2, 1, R.dark);
  // Torso
  rect(g, 3, 11, 10, 6, R.dark);
  rect(g, 4, 12, 8, 4, R.metal);
  // Chest panel + status light
  rect(g, 6, 12, 4, 3, R.panel);
  rect(g, 7, 13, 1, 1, R.light);
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

  // --- Desk workstation ---
  make(TEX.desk, 30, 22, (g) => {
    rect(g, 0, 0, 30, 22, 0x4a2e1a);
    rect(g, 1, 1, 28, 20, 0x8a5a34);
    rect(g, 1, 1, 28, 5, 0x9c6a40);
    g.fillStyle(0x6e4526, 1);
    for (let x = 4; x < 28; x += 6) g.fillRect(x, 7, 1, 13);
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
  make(TEX.tv, 46, 32, (g) => {
    rect(g, 18, 27, 10, 5, 0x1f2937); // stand
    rect(g, 1, 0, 44, 27, 0x0b0f17); // bezel
    rect(g, 3, 2, 40, 23, 0x14233f); // screen
    rect(g, 3, 2, 40, 4, 0x38bdf8); // glow bar
    g.fillStyle(0x1e3a5f, 1);
    rect(g, 7, 9, 14, 12, 0x1e3a5f); // picture blocks
    rect(g, 24, 9, 14, 12, 0x24507a);
  });
  make(TEX.console, 22, 14, (g) => {
    rect(g, 1, 1, 16, 9, 0x1f2937); // box
    rect(g, 3, 3, 2, 2, R.light); // power light
    rect(g, 3, 6, 11, 1, 0x111827); // slot
    rect(g, 17, 8, 4, 4, 0x334155); // controller
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
  make(TEX.plant, 18, 24, (g) => {
    rect(g, 6, 16, 6, 8, 0x6b4f3a); // pot
    rect(g, 5, 20, 8, 2, 0x4a2e1a);
    g.fillStyle(0x4d7c4d, 1);
    rect(g, 7, 4, 4, 12, 0x4d7c4d); // stem area
    rect(g, 3, 6, 5, 6, 0x5b9b5b); // leaves
    rect(g, 10, 6, 5, 6, 0x5b9b5b);
    rect(g, 6, 2, 6, 5, 0x6bbf6b);
  });

  // --- Characters: human (player) + robot (agents) ---
  (['down', 'up', 'side'] as Dir[]).forEach((dir) => {
    ([0, 1] as const).forEach((frame) => {
      make(charKey('human', dir, frame), CHAR_W, CHAR_H, (g) =>
        drawGrid(g, [...HUMAN_TORSO[dir], ...HUMAN_LEGS[frame]]),
      );
      make(charKey('robot', dir, frame), CHAR_W, CHAR_H, (g) => drawRobot(g, dir, frame));
    });
  });
}

/** Register the walk-cycle animations once. Safe to call repeatedly. */
export function ensureOfficeAnims(scene: Phaser.Scene): void {
  (['human', 'robot'] as CharKind[]).forEach((kind) => {
    (['down', 'up', 'side'] as Dir[]).forEach((dir) => {
      const key = walkAnim(kind, dir);
      if (scene.anims.exists(key)) return;
      scene.anims.create({
        key,
        frames: [{ key: charKey(kind, dir, 0) }, { key: charKey(kind, dir, 1) }],
        frameRate: 6,
        repeat: -1,
      });
    });
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
