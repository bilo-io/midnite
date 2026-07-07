/**
 * Phase 64 Theme B — pure per-peer interpolation. Remote peers arrive as discrete
 * ~10Hz position samples; renderers (2D Theme C, 3D Theme D) ease the drawn
 * position toward the latest target each frame so avatars glide instead of
 * teleporting. `three`/Phaser-free + unit-testable; both engines share it.
 */

export interface Point {
  x: number;
  y: number;
}

export interface InterpOptions {
  /** Approx smoothing window (ms) — larger = smoother but laggier. */
  rateMs?: number;
  /** Beyond this world-px gap, snap instead of easing (scene change / big jump). */
  snapDist?: number;
}

const DEFAULTS: Required<InterpOptions> = { rateMs: 120, snapDist: 96 };

/** Squared distance — avoids a sqrt in the hot path when only comparing. */
function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Ease `current` toward `target` for a `dtMs` frame. Snaps (returns `target`)
 * when the gap exceeds `snapDist` — a scene change or a reconnect jump shouldn't
 * animate a slide across the room. Otherwise a frame-rate-independent lerp:
 * `alpha = 1 - exp(-dt/rate)`.
 */
export function interpStep(current: Point, target: Point, dtMs: number, opts: InterpOptions = {}): Point {
  const { rateMs, snapDist } = { ...DEFAULTS, ...opts };
  if (dist2(current, target) >= snapDist * snapDist) return { x: target.x, y: target.y };
  const alpha = 1 - Math.exp(-Math.max(0, dtMs) / rateMs);
  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha,
  };
}

/** Whether a peer's move should snap rather than ease (scene change or big jump). */
export function shouldSnap(prevScene: string, nextScene: string, current: Point, target: Point, snapDist = DEFAULTS.snapDist): boolean {
  return prevScene !== nextScene || dist2(current, target) >= snapDist * snapDist;
}
