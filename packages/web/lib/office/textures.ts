/**
 * Procedural pixel-art for the office. Phase 8 replaces the Milestone-1 "blobs"
 * (Arc/Rectangle shapes) with real sprites — generated in code rather than loaded
 * from an external asset pack, so there's no licensing/coordinate-mapping step and
 * the art stays deterministic and themeable (tiles are drawn neutral and tinted to
 * the live theme palette at use; see lib/office/theme.ts).
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
} as const;

export type Dir = 'down' | 'up' | 'side';

/** Native (unscaled) character sprite size, in px. */
export const CHAR_W = 12;
export const CHAR_H = 15;

export const charKey = (dir: Dir, frame: 0 | 1) => `office-char-${dir}-${frame}`;
export const walkAnim = (dir: Dir) => `office-walk-${dir}`;

// Character pixel palette. Drawn mostly light (cloth = white) so a per-sprite
// tint colours the clothing/identity; dark parts (outline, hair, boots) survive
// the multiply and keep the silhouette readable.
const C: Record<string, number> = {
  ' ': -1, // transparent
  O: 0x1f2430, // outline / eyes
  H: 0x3a2a1a, // hair
  S: 0xe7c19b, // skin
  C: 0xf5f5f5, // cloth (tintable)
  P: 0x3f4756, // pants
  B: 0x222733, // boots
};

// Head + torso (rows 0–10), per facing. Legs (rows 11–14) are appended per frame.
const TORSO: Record<Dir, string[]> = {
  down: [
    '    HHHH    ',
    '   HSSSSH   ',
    '   HSSSSH   ',
    '   SSSSSS   ',
    '   SOSSOS   ',
    '   SSSSSS   ',
    '    SSSS    ',
    '   CCCCCC   ',
    '  CCCCCCCC  ',
    '  CCCCCCCC  ',
    '   CCCCCC   ',
  ],
  up: [
    '    HHHH    ',
    '   HHHHHH   ',
    '   HHHHHH   ',
    '   HHHHHH   ',
    '   HHHHHH   ',
    '   HHHHHH   ',
    '    SSSS    ',
    '   CCCCCC   ',
    '  CCCCCCCC  ',
    '  CCCCCCCC  ',
    '   CCCCCC   ',
  ],
  side: [
    '    HHHH    ',
    '   HSSSSH   ',
    '   HSSSSS   ',
    '   SSSSSS   ',
    '   SSSOSS   ',
    '   SSSSSS   ',
    '    SSSS    ',
    '   CCCCCC   ',
    '  CCCCCCCC  ',
    '  CCCCCCCC  ',
    '   CCCCCC   ',
  ],
};

// Legs: frame 0 = stance apart, frame 1 = feet together (alternating reads as a walk).
const LEGS: Record<0 | 1, string[]> = {
  0: ['   PPPPPP   ', '   PP  PP   ', '   PP  PP   ', '   BB  BB   '],
  1: ['    PPPP    ', '    PPPP    ', '    PPPP    ', '    BBBB    '],
};

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

/** Generate all office textures once. Safe to call repeatedly. */
export function ensureOfficeTextures(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // Floor tile — neutral grey so the theme tint colours it; a faint inset grid.
  make(TEX.floor, 32, 32, (g) => {
    rect(g, 0, 0, 32, 32, 0x9c9c9c);
    rect(g, 0, 0, 32, 16, 0x979797); // subtle two-tone
    rect(g, 16, 16, 16, 16, 0x979797);
    g.fillStyle(0x848484, 1);
    g.fillRect(31, 0, 1, 32); // right grid line
    g.fillRect(0, 31, 32, 1); // bottom grid line
  });

  // Wall tile — neutral brick (mortar lines), tinted to the theme wall colour.
  make(TEX.wall, 32, 32, (g) => {
    rect(g, 0, 0, 32, 32, 0xb4b4b4);
    g.fillStyle(0x8f8f8f, 1);
    for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 1); // mortar rows
    for (let y = 0; y < 32; y += 8) {
      const offset = (y / 8) % 2 === 0 ? 0 : 16;
      g.fillRect(offset, y, 1, 8);
      g.fillRect((offset + 16) % 32, y, 1, 8);
    }
  });

  // Desk — baked wood (decorative; reads on both themes).
  make(TEX.desk, 30, 22, (g) => {
    rect(g, 0, 0, 30, 22, 0x4a2e1a); // outline
    rect(g, 1, 1, 28, 20, 0x8a5a34); // body
    rect(g, 1, 1, 28, 5, 0x9c6a40); // top highlight
    g.fillStyle(0x6e4526, 1);
    for (let x = 4; x < 28; x += 6) g.fillRect(x, 7, 1, 13); // grain
  });

  // Monitor — dark bezel with a lit screen.
  make(TEX.monitor, 18, 14, (g) => {
    rect(g, 0, 0, 18, 12, 0x0f172a); // bezel
    rect(g, 2, 2, 14, 8, 0x1e3a5f); // screen
    rect(g, 2, 2, 14, 2, 0x38bdf8); // screen glow
    rect(g, 7, 12, 4, 2, 0x334155); // stand
  });

  // Chair — simple grey seat + back.
  make(TEX.chair, 16, 12, (g) => {
    rect(g, 2, 0, 12, 3, 0x475569); // back
    rect(g, 1, 4, 14, 6, 0x334155); // seat
  });

  // Character frames: torso + legs, per facing × 2 walk frames.
  (['down', 'up', 'side'] as Dir[]).forEach((dir) => {
    ([0, 1] as const).forEach((frame) => {
      make(charKey(dir, frame), CHAR_W, CHAR_H, (g) => drawGrid(g, [...TORSO[dir], ...LEGS[frame]]));
    });
  });
}

/** Register the walk-cycle animations once. Safe to call repeatedly. */
export function ensureOfficeAnims(scene: Phaser.Scene): void {
  (['down', 'up', 'side'] as Dir[]).forEach((dir) => {
    const key = walkAnim(dir);
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: [{ key: charKey(dir, 0) }, { key: charKey(dir, 1) }],
      frameRate: 6,
      repeat: -1,
    });
  });
}

// Soft, distinct identity tints so desks are distinguishable at a glance. Drawn
// over the light cloth, these read as different-coloured outfits.
const IDENTITY_TINTS = [
  0xf9a8d4, 0xa5b4fc, 0x86efac, 0xfcd34d, 0xfca5a5, 0x67e8f9, 0xc4b5fd, 0xfdba74,
] as const;

/** Deterministic identity tint for an agent id (stable across refetches). */
export function agentTint(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return IDENTITY_TINTS[hash % IDENTITY_TINTS.length]!;
}
