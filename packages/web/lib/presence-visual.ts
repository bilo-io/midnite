/**
 * Phase 64 Theme C — pure mapping from a presence peer's wire fields to the 2D
 * office's sprite vocabulary (char kind/variant + facing direction + flip). Kept
 * Phaser-free so the `PeerLayer` render logic is unit-testable without a canvas.
 */

import type { PresenceFacing } from '@midnite/shared';
import type { CharKind } from '@/lib/office/textures';

/** Avatar `variant` (-1 human, 0–5 robot) → the office char sheet kind + index. */
export function charForVariant(variant: number): { kind: CharKind; v: number } {
  return variant < 0 ? { kind: 'human', v: 0 } : { kind: 'robot', v: variant };
}

/** Wire facing → the 2D sprite direction + horizontal flip (left = side + flip). */
export function facingToDir(facing: PresenceFacing): { dir: 'down' | 'up' | 'side'; flip: boolean } {
  switch (facing) {
    case 'up':
      return { dir: 'up', flip: false };
    case 'left':
      return { dir: 'side', flip: true };
    case 'right':
      return { dir: 'side', flip: false };
    default:
      return { dir: 'down', flip: false };
  }
}
