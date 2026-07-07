/**
 * Phase 63 Theme B — first-person collision. Pure, `three`-free grid-AABB
 * collision resolved against the **same** walkability data the 2D office uses
 * ([`office/layout.ts`](../office/layout.ts) `blockedGrid()` — walls + furniture
 * + pool), so the 3D player collides with exactly what the 2D player does.
 *
 * The player is a circle of radius `r` on the XZ floor plane; a blocked tile
 * `(tx, ty)` occupies the world AABB `[tx, tx+1] × [ty, ty+1]` (1 unit = 1 tile).
 * Movement resolves **per axis** (X then Z, each against the other's resolved
 * position) so you slide smoothly along a wall instead of sticking on it, and
 * pass cleanly through the 2-tile doorways.
 */

/** True if tile `(tx, ty)` is solid. Out-of-bounds counts as a wall. */
function isBlocked(tx: number, ty: number, grid: readonly (readonly boolean[])[]): boolean {
  const row = grid[ty];
  if (!row) return true;
  if (tx < 0 || tx >= row.length) return true;
  return row[tx] === true;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Does a circle at world `(x, z)` with radius `r` overlap any blocked tile?
 * Only the tiles the circle's bounding box can touch are checked.
 */
export function circleHitsBlocked(
  x: number,
  z: number,
  r: number,
  grid: readonly (readonly boolean[])[],
): boolean {
  const minTx = Math.floor(x - r);
  const maxTx = Math.floor(x + r);
  const minTy = Math.floor(z - r);
  const maxTy = Math.floor(z + r);
  const r2 = r * r;
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isBlocked(tx, ty, grid)) continue;
      // Closest point on the tile AABB to the circle centre.
      const cx = clamp(x, tx, tx + 1);
      const cz = clamp(z, ty, ty + 1);
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < r2) return true;
    }
  }
  return false;
}

/**
 * Resolve a desired move `(dx, dz)` from world `(x, z)` against the blocked grid,
 * axis-independently so the player slides along walls. Returns the new position;
 * an axis whose step would collide is cancelled while the other still applies.
 */
export function resolveMove(
  x: number,
  z: number,
  dx: number,
  dz: number,
  grid: readonly (readonly boolean[])[],
  r: number,
): { x: number; z: number } {
  let nx = x;
  let nz = z;
  if (dx !== 0 && !circleHitsBlocked(x + dx, z, r, grid)) nx = x + dx;
  if (dz !== 0 && !circleHitsBlocked(nx, z + dz, r, grid)) nz = z + dz;
  return { x: nx, z: nz };
}
