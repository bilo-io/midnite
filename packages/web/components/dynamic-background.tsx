'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { BackgroundPattern } from '@midnite/shared';
import { cn } from '@/lib/utils';

/**
 * Dynamic (cursor-reactive) background patterns — Settings → Appearance →
 * "Dynamic motion". Each static CSS pattern from globals.css has a canvas twin
 * here that (a) idles with a subtle ambient animation and (b) reacts to the
 * pointer within an influence radius (~32rem):
 *
 * - dots / grid / diagonal: points and lines are *repulsed* away from the cursor
 * - honeycomb: cells swell near the cursor, decaying with distance
 * - plus-cross / blueprint: a tracking-ruler crosshair follows the cursor
 * - waves: amplitude ripples up around the cursor
 * - topographic: contours bend away, like a peak pushing through the map
 * - grain: speckles scatter and brighten under the cursor
 * - gradient / aurora / mesh-gradient: 3–6 soft colour clouds drift on their own
 *   and shy away from the cursor with a lagging, cloud-like ease
 *
 * Mount this only when `useDynamicBackground()` is true — motion gating (the
 * Motion setting + OS reduced-motion) lives there, not here. Colours are read
 * live from the theme tokens on <html>, so theme/accent switches re-tint the
 * canvas without a remount.
 */

const TAU = Math.PI * 2;

/** Influence radius around the cursor, in rem (user spec: ~30–40rem max). */
const INFLUENCE_REM = 32;

/** Same edge fade the static CSS patterns use, applied to the canvas itself. */
const MASK = 'radial-gradient(ellipse at center, black 30%, transparent 75%)';

type Tokens = {
  /** HSL triples (e.g. `"240 5.9% 90%"`) straight from the CSS custom props. */
  border: string;
  fg: string;
  /** `--node-trigger` / `--node-action` / `--node-logic` / `--node-data`. */
  nodes: [string, string, string, string];
  /** `--bg-intensity` (gradient pattern opacity), 0.1–0.4. */
  intensity: number;
};

type Frame = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** Seconds since mount. */
  t: number;
  /** Smoothed cursor position in canvas coordinates. */
  mx: number;
  my: number;
  /** Cursor presence strength, eased 0→1 on enter and back on leave. */
  s: number;
  /** Influence radius in px. */
  R: number;
  tk: Tokens;
};

/** Per-pattern mutable caches that persist across frames (cloud positions, speckles). */
type EngineState = {
  speckles?: { x: number; y: number; a: number; spd: number; ph: number }[];
  speckleKey?: string;
  clouds?: { x: number; y: number }[];
};

function readTokens(): Tokens {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    border: v('--border', '240 5.9% 90%'),
    fg: v('--foreground', '240 10% 3.9%'),
    nodes: [
      v('--node-trigger', '38 92% 50%'),
      v('--node-action', '217 91% 60%'),
      v('--node-logic', '280 65% 60%'),
      v('--node-data', '142 71% 45%'),
    ],
    intensity: Number.parseFloat(v('--bg-intensity', '0.2')) || 0.2,
  };
}

/** Deterministic per-cell pseudo-random in [0,1) — stable across frames. */
function hash2(i: number, j: number): number {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/** Cursor falloff: 1 at the cursor → 0 at distance R, smooth in between. */
function fall(d: number, R: number): number {
  return smoothstep(1 - d / R);
}

/** Displace a point radially away from the cursor (the "repulse" effect). */
function repulse(x: number, y: number, f: Frame, maxPush: number): [number, number] {
  const dx = x - f.mx;
  const dy = y - f.my;
  const d = Math.hypot(dx, dy);
  if (d >= f.R || d < 0.5 || f.s < 0.005) return [x, y];
  const k = (fall(d, f.R) * maxPush * f.s) / d;
  return [x + dx * k, y + dy * k];
}

/**
 * A radial "relight" gradient centred on the cursor: `peak` alpha at the cursor
 * fading to 0 at `radiusScale × R`. Used as a second stroke/fill pass over a
 * pattern's Path2D so everything near the cursor glows brighter — the cheap,
 * uniform way to give every pattern an enhanced cursor-local presence.
 */
function cursorGradient(f: Frame, color: string, peak: number, radiusScale = 1): CanvasGradient {
  const g = f.ctx.createRadialGradient(f.mx, f.my, 0, f.mx, f.my, f.R * radiusScale);
  g.addColorStop(0, `hsl(${color} / ${(peak * f.s).toFixed(3)})`);
  g.addColorStop(1, `hsl(${color} / 0)`);
  return g;
}

// ── Renderers ────────────────────────────────────────────────────────────────────

/**
 * Dots (20px lattice) as a slow nebula: the field shears around a wandering
 * galactic centre (spiral arms forming and relaxing), every dot twinkles on its
 * own rhythm, a few read as brighter "stars" — and the cursor still scatters
 * points within its radius.
 */
function drawDots(f: Frame): void {
  const sp = 20;
  const { ctx } = f;
  // Wandering galactic centre the swirl bends around.
  const gcx = f.w * (0.5 + 0.22 * Math.sin(f.t * 0.05));
  const gcy = f.h * (0.5 + 0.22 * Math.cos(f.t * 0.04));
  // Twinkle alphas are quantized into buckets so fills stay batched (one fill
  // per alpha level instead of one per dot).
  const alphas = [0.12, 0.2, 0.28, 0.38, 0.65];
  const buckets: Path2D[] = alphas.map(() => new Path2D());
  for (let gx = -1; gx * sp <= f.w + sp; gx++) {
    for (let gy = -1; gy * sp <= f.h + sp; gy++) {
      const hshA = hash2(gx, gy);
      const hshB = hash2(gy * 3 + 7, gx * 5 + 1);
      // Galaxy swirl: an oscillating spiral shear — rotation waves with radius
      // so arms wind up and unwind rather than dissolving the lattice.
      const dxc = gx * sp - gcx;
      const dyc = gy * sp - gcy;
      const rc = Math.hypot(dxc, dyc);
      const swirl = 0.14 * Math.sin(f.t * 0.26 - rc / 260);
      const cos = Math.cos(swirl);
      const sin = Math.sin(swirl);
      let x = gcx + dxc * cos - dyc * sin + Math.sin(f.t * 0.6 + hshA * TAU) * 2.2;
      let y = gcy + dxc * sin + dyc * cos + Math.cos(f.t * 0.5 + hshA * TAU * 2) * 2.2;
      [x, y] = repulse(x, y, f, sp * 1.5);
      const star = hshB > 0.955;
      const twinkle = 0.5 + 0.5 * Math.sin(f.t * (0.6 + hshB * 1.4) + hshA * TAU);
      const r = star ? 2.1 : 0.9 + hshB * 0.8;
      const p = buckets[star ? 4 : Math.min(3, Math.floor(twinkle * 4))]!;
      p.moveTo(x + r, y);
      p.arc(x, y, r, 0, TAU);
    }
  }
  buckets.forEach((p, i) => {
    ctx.fillStyle = `hsl(${f.tk.fg} / ${alphas[i]})`;
    ctx.fill(p);
  });
  if (f.s > 0.01) {
    // The nebula ignites around the cursor: every dot near it relights over its
    // twinkle level, so the scattered clearing reads as a glowing rim.
    const glow = cursorGradient(f, f.tk.fg, 0.5, 0.85);
    buckets.forEach((p) => {
      ctx.fillStyle = glow;
      ctx.fill(p);
    });
  }
}

/**
 * Grid (32px) as slow-breathing fabric: lines undulate in a travelling weave
 * wave (never sitting perfectly straight), drift gently, and bulge away from
 * the cursor.
 */
function drawGrid(f: Frame): void {
  const sp = 32;
  const step = 16;
  const push = 18;
  const { ctx } = f;
  const off = (f.t * 1.5) % sp;
  const weaveX = (x: number, y: number) => Math.sin(y * 0.02 + f.t * 0.5 + x * 0.01) * 2.2;
  const weaveY = (x: number, y: number) => Math.sin(x * 0.018 - f.t * 0.45 + y * 0.01) * 2.2;
  const path = new Path2D();
  for (let x = -sp + off; x <= f.w + sp; x += sp) {
    for (let y = -step; y <= f.h + step; y += step) {
      const [px, py] = repulse(x + weaveX(x, y), y, f, push);
      if (y === -step) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
  }
  for (let y = -sp + off; y <= f.h + sp; y += sp) {
    for (let x = -step; x <= f.w + step; x += step) {
      const [px, py] = repulse(x, y + weaveY(x, y), f, push);
      if (x === -step) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = `hsl(${f.tk.fg} / 0.14)`;
  ctx.stroke(path);
  if (f.s > 0.01) {
    // Circuit-glow: the warped lines relight around the cursor…
    ctx.strokeStyle = cursorGradient(f, f.tk.fg, 0.55);
    ctx.stroke(path);
    // …and the intersections inside the radius spark as nodes.
    const nodes = new Path2D();
    for (let x = -sp + off; x <= f.w + sp; x += sp) {
      for (let y = -sp + off; y <= f.h + sp; y += sp) {
        if (Math.hypot(x - f.mx, y - f.my) > f.R * 0.8) continue;
        const [px, py] = repulse(x + weaveX(x, y), y + weaveY(x, y), f, push);
        nodes.moveTo(px + 1.7, py);
        nodes.arc(px, py, 1.7, 0, TAU);
      }
    }
    ctx.fillStyle = cursorGradient(f, f.tk.fg, 0.9, 0.8);
    ctx.fill(nodes);
  }
}

/**
 * Honeycomb (48×18 offset rows): a swell-ring pulse radiates from a slowly
 * wandering epicentre, each bubble breathes on its own beat, and cells swell
 * hard around the cursor with distance decay.
 */
function drawHoneycomb(f: Frame): void {
  const cw = 48;
  const rh = 18;
  const r0 = 12;
  const { ctx } = f;
  const ex = f.w * (0.5 + 0.35 * Math.sin(f.t * 0.09));
  const ey = f.h * (0.5 + 0.35 * Math.cos(f.t * 0.07));
  const path = new Path2D();
  for (let row = -1; row * rh <= f.h + rh; row++) {
    const xoff = row % 2 ? cw / 2 : 0;
    for (let col = -1; col * cw + xoff <= f.w + cw; col++) {
      const x = col * cw + xoff;
      const y = row * rh;
      const hsh = hash2(col, row);
      const d = Math.hypot(x - f.mx, y - f.my);
      const pulse = 0.12 * Math.sin(f.t * 1.1 - Math.hypot(x - ex, y - ey) / 90);
      const scale =
        1 + 1.15 * fall(d, f.R) * f.s + 0.07 * Math.sin(f.t * 0.8 + hsh * TAU) + pulse;
      const r = r0 * scale;
      path.moveTo(x + r, y);
      path.arc(x, y, r, 0, TAU);
    }
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = `hsl(${f.tk.fg} / 0.15)`;
  ctx.stroke(path);
  if (f.s > 0.01) {
    // Bubbles relight around the cursor, plus a faint interior glow so the
    // swollen cells read as lit from within.
    ctx.strokeStyle = cursorGradient(f, f.tk.fg, 0.6);
    ctx.stroke(path);
    ctx.fillStyle = cursorGradient(f, f.tk.fg, 0.07, 0.7);
    ctx.fill(path);
  }
}

/** Diagonal lines (12px, 45°): lines scroll slowly and bow around the cursor. */
function drawDiagonal(f: Frame): void {
  const sp = 12;
  const step = 14;
  const { ctx } = f;
  const off = (f.t * 2.5) % sp;
  const path = new Path2D();
  // Lines of constant x + y = c (45°), c sweeping the whole canvas. Each line
  // sways perpendicular to itself on its own phase, like harp strings.
  for (let c = -sp + off; c <= f.w + f.h + sp; c += sp) {
    const x0 = Math.max(-step, c - f.h - step);
    const x1 = Math.min(f.w + step, c + step);
    const sway = Math.sin(f.t * 0.5 + c * 0.045) * 1.6;
    let first = true;
    for (let x = x0; x <= x1; x += step) {
      const [px, py] = repulse(x + sway * 0.7, c - x + sway * 0.7, f, 12);
      if (first) path.moveTo(px, py);
      else path.lineTo(px, py);
      first = false;
    }
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = `hsl(${f.tk.fg} / 0.14)`;
  ctx.stroke(path);
  if (f.s > 0.01) {
    // Plucked strings: the bowed lines relight around the cursor.
    ctx.strokeStyle = cursorGradient(f, f.tk.fg, 0.55);
    ctx.stroke(path);
  }
}

/** Plus lattice (24px): a shimmer wave idles; the cursor gets a tracking ruler. */
function drawPlusCross(f: Frame): void {
  const sp = 24;
  const arm = 5;
  const { ctx } = f;
  const cols = Math.ceil(f.w / sp) + 1;
  const rows = Math.ceil(f.h / sp) + 1;
  const nearCol = Math.round((f.mx - sp / 2) / sp);
  const nearRow = Math.round((f.my - sp / 2) / sp);

  // Base pluses, bucketed by a slow travelling alpha wave (6 phase buckets keeps
  // it batched instead of one stroke per cell). A sprinkling of "sparkle" cells
  // pulse brighter on their own beat so the field glints even untouched.
  const buckets: Path2D[] = Array.from({ length: 6 }, () => new Path2D());
  const sparkles: Path2D[] = Array.from({ length: 3 }, () => new Path2D());
  const ruler = new Path2D();
  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      const x = gx * sp + sp / 2;
      const y = gy * sp + sp / 2;
      const onRuler =
        f.s > 0.02 &&
        (gx === nearCol || gy === nearRow) &&
        Math.hypot(x - f.mx, y - f.my) < f.R;
      const sparkle = !onRuler && hash2(gx * 13 + 5, gy * 7 + 3) > 0.982;
      const p = onRuler ? ruler : sparkle ? sparkles[(gx + gy) % 3]! : buckets[(gx + gy) % 6]!;
      const a = onRuler ? arm + 2 : sparkle ? arm + 1 : arm;
      p.moveTo(x - a, y);
      p.lineTo(x + a, y);
      p.moveTo(x, y - a);
      p.lineTo(x, y + a);
    }
  }
  ctx.lineWidth = 1.4;
  const all = new Path2D();
  buckets.forEach((p, i) => {
    const wave = 0.16 + 0.08 * Math.sin(f.t * 0.9 + (i / 6) * TAU);
    ctx.strokeStyle = `hsl(${f.tk.fg} / ${wave.toFixed(3)})`;
    ctx.stroke(p);
    all.addPath(p);
  });
  sparkles.forEach((p, i) => {
    const glint = 0.3 + 0.22 * Math.sin(f.t * 1.4 + (i / 3) * TAU);
    ctx.strokeStyle = `hsl(${f.tk.fg} / ${glint.toFixed(3)})`;
    ctx.stroke(p);
    all.addPath(p);
  });

  if (f.s > 0.02) {
    // Every plus near the cursor relights, the tracked row/column pops hardest,
    // and full-span hairlines cross through the cursor.
    ctx.strokeStyle = cursorGradient(f, f.tk.fg, 0.5);
    ctx.stroke(all);
    ctx.strokeStyle = `hsl(${f.tk.fg} / ${(0.9 * f.s).toFixed(3)})`;
    ctx.stroke(ruler);
    drawCrosshair(f, f.tk.fg, 0.45, 0.12);
  }
}

/**
 * Full-span crosshair through the cursor: the axis lines run edge-to-edge (and
 * 50px past, so their ends are never visible on the canvas), brightest at the
 * cursor and easing down to a floor alpha rather than vanishing mid-canvas.
 */
function drawCrosshair(f: Frame, color: string, peak: number, floor: number): void {
  const { ctx } = f;
  const span = Math.max(f.w, f.h);
  ctx.lineWidth = 1;
  for (const horizontal of [true, false]) {
    const g = horizontal
      ? ctx.createLinearGradient(f.mx - span, 0, f.mx + span, 0)
      : ctx.createLinearGradient(0, f.my - span, 0, f.my + span);
    g.addColorStop(0, `hsl(${color} / ${(floor * f.s).toFixed(3)})`);
    g.addColorStop(0.5, `hsl(${color} / ${(peak * f.s).toFixed(3)})`);
    g.addColorStop(1, `hsl(${color} / ${(floor * f.s).toFixed(3)})`);
    ctx.strokeStyle = g;
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(-50, f.my);
      ctx.lineTo(f.w + 50, f.my);
    } else {
      ctx.moveTo(f.mx, -50);
      ctx.lineTo(f.mx, f.h + 50);
    }
    ctx.stroke();
  }
}

/** Blueprint: dual-scale blue grid, an idle scan band, and a ruler crosshair. */
function drawBlueprint(f: Frame): void {
  const { ctx } = f;
  const blue = '217 91% 60%';
  const gridPath = (sp: number) => {
    const p = new Path2D();
    for (let x = 0; x <= f.w; x += sp) {
      p.moveTo(x, 0);
      p.lineTo(x, f.h);
    }
    for (let y = 0; y <= f.h; y += sp) {
      p.moveTo(0, y);
      p.lineTo(f.w, y);
    }
    return p;
  };
  const minor = gridPath(16);
  const major = gridPath(80);
  ctx.lineWidth = 1;
  ctx.strokeStyle = `hsl(${blue} / 0.14)`;
  ctx.stroke(minor);
  ctx.strokeStyle = `hsl(${blue} / 0.32)`;
  ctx.stroke(major);
  if (f.s > 0.01) {
    // The drawing lights up under the pen: minor cells relight near the cursor.
    ctx.strokeStyle = cursorGradient(f, blue, 0.45, 0.9);
    ctx.stroke(minor);
  }

  // Idle scan band sweeping left → right, like a plotter pass.
  const bandW = 260;
  const bx = ((f.t * 45) % (f.w + bandW * 2)) - bandW;
  const band = ctx.createLinearGradient(bx - bandW / 2, 0, bx + bandW / 2, 0);
  band.addColorStop(0, `hsl(${blue} / 0)`);
  band.addColorStop(0.5, `hsl(${blue} / 0.1)`);
  band.addColorStop(1, `hsl(${blue} / 0)`);
  ctx.fillStyle = band;
  ctx.fillRect(bx - bandW / 2, 0, bandW, f.h);

  if (f.s > 0.02) {
    // Tracking ruler: full-span crosshair through the cursor (no visible line
    // ends) with minor/major tick marks that fade out with distance.
    drawCrosshair(f, blue, 0.8, 0.25);
    for (const horizontal of [true, false]) {
      ctx.beginPath();
      const centre = horizontal ? f.mx : f.my;
      const from = centre - f.R * 1.5;
      const to = centre + f.R * 1.5;
      for (let p = Math.ceil(from / 16) * 16; p <= to; p += 16) {
        const len = p % 80 === 0 ? 7 : 3;
        if (horizontal) {
          ctx.moveTo(p, f.my - len);
          ctx.lineTo(p, f.my + len);
        } else {
          ctx.moveTo(f.mx - len, p);
          ctx.lineTo(f.mx + len, p);
        }
      }
      ctx.strokeStyle = `hsl(${blue} / ${(0.4 * f.s).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

/**
 * Topographic: wobbling contour rings around two slowly wandering foci — the
 * whole map drifts like a survey of shifting terrain — bent by the cursor.
 */
function drawTopographic(f: Frame): void {
  const { ctx } = f;
  const centers: [number, number][] = [
    [(0.3 + 0.05 * Math.sin(f.t * 0.06)) * f.w, (0.4 + 0.06 * Math.cos(f.t * 0.05)) * f.h],
    [(0.7 + 0.05 * Math.cos(f.t * 0.045)) * f.w, (0.65 + 0.06 * Math.sin(f.t * 0.055)) * f.h],
  ];
  ctx.lineWidth = 1;
  centers.forEach(([cx, cy], ci) => {
    for (let ring = 1; ring <= 8; ring++) {
      const rr = ring * 24 + Math.sin(f.t * 0.25 + ring * 0.8 + ci * 2) * 3;
      ctx.strokeStyle = `hsl(${f.tk.fg} / ${Math.max(0.07, 0.32 - ring * 0.03).toFixed(3)})`;
      ctx.beginPath();
      for (let k = 0; k <= 72; k++) {
        const a = (k / 72) * TAU;
        const wob =
          Math.sin(a * 3 + f.t * 0.3 + ring * 1.7) * 3 +
          Math.sin(a * 5 - f.t * 0.2 + ci * 3) * 2;
        let x = cx + Math.cos(a) * (rr * 1.7 + wob * 2);
        let y = cy + Math.sin(a) * (rr * 0.85 + wob);
        [x, y] = repulse(x, y, f, 30);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  });

  if (f.s > 0.02) {
    // The cursor is a peak pushing up through the map: fresh contour rings grow
    // around it, brightest at the summit and rippling gently.
    for (let ring = 1; ring <= 5; ring++) {
      const rr = ring * 26 + Math.sin(f.t * 1.1 - ring * 0.9) * 4;
      ctx.strokeStyle = `hsl(${f.tk.fg} / ${((0.5 - ring * 0.08) * f.s).toFixed(3)})`;
      ctx.beginPath();
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * TAU;
        const wob = Math.sin(a * 4 + f.t * 0.8 + ring) * 2.5;
        const x = f.mx + Math.cos(a) * (rr * 1.4 + wob);
        const y = f.my + Math.sin(a) * (rr * 0.8 + wob);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

/**
 * Waves: rolling sine rows like open water — a slow swell cycle rides on top of
 * the wave phase (sets roll through the field), rows bob vertically, and
 * amplitude surges around the cursor.
 */
function drawWaves(f: Frame): void {
  const rowSp = 24;
  const wl = 64;
  const amp = 5;
  const step = 8;
  const { ctx } = f;
  const path = new Path2D();
  for (let y0 = -rowSp; y0 <= f.h + rowSp; y0 += rowSp) {
    const swell = 1 + 0.3 * Math.sin(f.t * 0.25 + y0 * 0.012);
    const bob = Math.sin(f.t * 0.18 + y0 * 0.05) * 2;
    for (let x = -step; x <= f.w + step; x += step) {
      const boost = swell + 1.6 * fall(Math.hypot(x - f.mx, y0 - f.my), f.R) * f.s;
      const y = y0 + bob + Math.sin((x / wl) * TAU + f.t * 0.8 + y0 * 0.05) * amp * boost;
      if (x === -step) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = `hsl(${f.tk.fg} / 0.16)`;
  ctx.stroke(path);
  if (f.s > 0.02) {
    // The water relights around the cursor…
    ctx.strokeStyle = cursorGradient(f, f.tk.fg, 0.5);
    ctx.stroke(path);
    // …and ripple rings expand outward from it like a dropped stone.
    for (let i = 0; i < 3; i++) {
      const rr = (f.t * 70 + (i * f.R) / 3) % f.R;
      if (rr < 8) continue;
      const a = (1 - rr / f.R) * 0.35 * f.s;
      ctx.strokeStyle = `hsl(${f.tk.fg} / ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(f.mx, f.my, rr, rr * 0.55, 0, 0, TAU);
      ctx.stroke();
    }
  }
}

/** Grain: a stable speckle field that flickers idly and scatters at the cursor. */
function drawGrain(f: Frame, st: EngineState): void {
  const key = `${f.w}x${f.h}`;
  if (!st.speckles || st.speckleKey !== key) {
    const count = Math.min(6000, Math.round((f.w * f.h) / 700));
    // Seeded positions (hash2 over the index) so a resize reshuffles but frames don't.
    st.speckles = Array.from({ length: count }, (_, i) => ({
      x: hash2(i, 1) * f.w,
      y: hash2(i, 2) * f.h,
      a: 0.06 + hash2(i, 3) * 0.12,
      spd: 0.4 + hash2(i, 4) * 1.2,
      ph: hash2(i, 5) * TAU,
    }));
    st.speckleKey = key;
  }
  const { ctx } = f;
  // Quantize per-speckle alpha into buckets so fills stay batched.
  const buckets: Path2D[] = Array.from({ length: 6 }, () => new Path2D());
  for (const p of st.speckles) {
    const flicker = 0.6 + 0.4 * Math.sin(f.t * p.spd + p.ph);
    // Brownian shimmer: every speckle wanders a few px on its own orbit, so the
    // field reads as drifting dust rather than a frozen still.
    const bx = p.x + Math.sin(f.t * 0.25 * p.spd + p.ph) * 3;
    const by = p.y + Math.cos(f.t * 0.2 * p.spd + p.ph * 1.3) * 3;
    // Iron-filings swirl: dust inside the radius is drawn into a slow orbit
    // around the cursor (tangential pull + slight outward push) and brightens.
    const dxm = bx - f.mx;
    const dym = by - f.my;
    const dm = Math.hypot(dxm, dym) || 1;
    const nearK = fall(dm, f.R) * f.s;
    const x = bx + (-dym / dm) * nearK * 16 + (dxm / dm) * nearK * 5;
    const y = by + (dxm / dm) * nearK * 16 + (dym / dm) * nearK * 5;
    const alpha = p.a * flicker * (1 + nearK * 2.2);
    const bucket = Math.min(5, Math.floor((alpha / 0.3) * 6));
    buckets[bucket]!.rect(x, y, 1.5, 1.5);
  }
  buckets.forEach((p, i) => {
    ctx.fillStyle = `hsl(${f.tk.fg} / ${(((i + 0.5) / 6) * 0.3).toFixed(3)})`;
    ctx.fill(p);
  });
}

// ── Colour-cloud engine (gradient / aurora / mesh-gradient) ─────────────────────

type CloudSpec = {
  /** Anchor position as a fraction of the canvas. */
  ax: number;
  ay: number;
  /** Drift amplitude as a fraction of the canvas. */
  drift: number;
  /** Drift speed multiplier + phase, so clouds move out of sync. */
  spd: number;
  ph: number;
  /** Radius as a fraction of max(w, h). */
  r: number;
  /** Vertical squash (1 = round; aurora ribbons use ~0.45). */
  sy: number;
  /** Index into the node-colour tokens. */
  colorIdx: 0 | 1 | 2 | 3;
  alpha: number;
};

function drawClouds(
  f: Frame,
  st: EngineState,
  specs: CloudSpec[],
  pushPx: number,
  glow: number,
): void {
  const { ctx } = f;
  if (!st.clouds || st.clouds.length !== specs.length) {
    st.clouds = specs.map((c) => ({ x: c.ax * f.w, y: c.ay * f.h }));
  }
  specs.forEach((c, i) => {
    const cur = st.clouds![i]!;
    // Lissajous idle drift around the anchor (two incommensurate frequencies per
    // axis so the path never visibly repeats)…
    const dx =
      (Math.sin(f.t * 0.11 * c.spd + c.ph) + 0.4 * Math.sin(f.t * 0.043 * c.spd + c.ph * 2.3)) *
      c.drift *
      f.w;
    const dy =
      (Math.cos(f.t * 0.13 * c.spd + c.ph * 1.7) + 0.4 * Math.cos(f.t * 0.037 * c.spd + c.ph)) *
      c.drift *
      f.h;
    let tx = c.ax * f.w + dx;
    let ty = c.ay * f.h + dy;
    // …plus a soft repulsion from the cursor, wider than the point patterns so
    // the whole cloud reacts, and eased below so it lags like a cloud should.
    const cd = Math.hypot(tx - f.mx, ty - f.my);
    if (cd > 0.5 && f.s > 0.005) {
      const k = (fall(cd, f.R * 1.5) * pushPx * f.s) / cd;
      tx += (tx - f.mx) * k;
      ty += (ty - f.my) * k;
    }
    cur.x += (tx - cur.x) * 0.04;
    cur.y += (ty - cur.y) * 0.04;

    // Clouds breathe: radius and opacity swell and settle on offset rhythms.
    const breathe = 1 + 0.08 * Math.sin(f.t * 0.17 * c.spd + c.ph * 3.1);
    const r = c.r * Math.max(f.w, f.h) * breathe;
    const alpha = c.alpha * (0.85 + 0.15 * Math.sin(f.t * 0.23 * c.spd + c.ph));
    ctx.save();
    ctx.translate(cur.x, cur.y);
    ctx.scale(1, c.sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `hsl(${f.tk.nodes[c.colorIdx]} / ${alpha.toFixed(3)})`);
    g.addColorStop(1, `hsl(${f.tk.nodes[c.colorIdx]} / 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  });

  if (glow > 0 && f.s > 0.01) {
    // A small luminous wisp trails the cursor — the "you're touching the sky"
    // counterpart to the big clouds shying away.
    const wisp = ctx.createRadialGradient(f.mx, f.my, 0, f.mx, f.my, f.R * 0.55);
    wisp.addColorStop(0, `hsl(${f.tk.nodes[1]} / ${(glow * f.s).toFixed(3)})`);
    wisp.addColorStop(1, `hsl(${f.tk.nodes[1]} / 0)`);
    ctx.fillStyle = wisp;
    ctx.fillRect(f.mx - f.R, f.my - f.R, f.R * 2, f.R * 2);
  }
}

/** Gradient: three big drifting colour clouds; opacity follows `--bg-intensity`. */
function drawGradient(f: Frame, st: EngineState): void {
  const a = f.tk.intensity;
  drawClouds(
    f,
    st,
    [
      { ax: 0.28, ay: 0.35, drift: 0.11, spd: 1, ph: 0, r: 0.42, sy: 1, colorIdx: 0, alpha: a },
      { ax: 0.72, ay: 0.4, drift: 0.12, spd: 0.8, ph: 2.1, r: 0.45, sy: 1, colorIdx: 2, alpha: a },
      { ax: 0.5, ay: 0.72, drift: 0.09, spd: 1.2, ph: 4.2, r: 0.4, sy: 1, colorIdx: 3, alpha: a * 0.9 },
    ],
    140,
    f.tk.intensity * 0.55,
  );
}

/** Aurora: three elongated ribbons in the static pattern's colours/alphas. */
function drawAurora(f: Frame, st: EngineState): void {
  drawClouds(
    f,
    st,
    [
      { ax: 0.2, ay: 0.3, drift: 0.08, spd: 1, ph: 0, r: 0.45, sy: 0.45, colorIdx: 0, alpha: 0.14 },
      { ax: 0.8, ay: 0.7, drift: 0.09, spd: 0.7, ph: 2.5, r: 0.4, sy: 0.42, colorIdx: 1, alpha: 0.12 },
      { ax: 0.55, ay: 0.55, drift: 0.08, spd: 1.3, ph: 4.6, r: 0.35, sy: 0.4, colorIdx: 3, alpha: 0.1 },
    ],
    110,
    0.09,
  );
}

/** Mesh gradient: the six CSS anchor blobs, gently drifting and cursor-shy. */
function drawMeshGradient(f: Frame, st: EngineState): void {
  drawClouds(
    f,
    st,
    [
      { ax: 0.2, ay: 0.2, drift: 0.05, spd: 1, ph: 0, r: 0.34, sy: 1, colorIdx: 0, alpha: 0.18 },
      { ax: 0.8, ay: 0.1, drift: 0.05, spd: 0.8, ph: 1.2, r: 0.34, sy: 1, colorIdx: 1, alpha: 0.15 },
      { ax: 0.05, ay: 0.55, drift: 0.05, spd: 1.2, ph: 2.4, r: 0.34, sy: 1, colorIdx: 2, alpha: 0.12 },
      { ax: 0.85, ay: 0.55, drift: 0.05, spd: 0.9, ph: 3.6, r: 0.34, sy: 1, colorIdx: 0, alpha: 0.1 },
      { ax: 0.2, ay: 0.9, drift: 0.05, spd: 1.1, ph: 4.8, r: 0.34, sy: 1, colorIdx: 3, alpha: 0.14 },
      { ax: 0.8, ay: 0.85, drift: 0.05, spd: 0.7, ph: 6, r: 0.34, sy: 1, colorIdx: 1, alpha: 0.12 },
    ],
    80,
    0.09,
  );
}

const RENDERERS: Record<BackgroundPattern, (f: Frame, st: EngineState) => void> = {
  dots: drawDots,
  grid: drawGrid,
  honeycomb: drawHoneycomb,
  'diagonal-lines': drawDiagonal,
  'plus-cross': drawPlusCross,
  blueprint: drawBlueprint,
  topographic: drawTopographic,
  waves: drawWaves,
  grain: drawGrain,
  gradient: drawGradient,
  aurora: drawAurora,
  'mesh-gradient': drawMeshGradient,
};

// ── Component ────────────────────────────────────────────────────────────────────

export function DynamicBackground({
  pattern,
  className,
  style,
}: {
  pattern: BackgroundPattern;
  className?: string;
  style?: CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let R = 512;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      // Cap DPR: the backdrop is soft/decorative, so 1.5× is indistinguishable
      // from native and halves the pixel work on 2–3× displays.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rem =
        Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      R = Math.min(640, Math.max(320, INFLUENCE_REM * rem));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let tk = readTokens();
    const mo = new MutationObserver(() => {
      tk = readTokens();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-accent', 'data-accent-2', 'data-bg-intensity', 'data-density'],
    });

    // Raw pointer target (canvas coords) + presence; the loop eases toward it.
    let txp = -1e5;
    let typ = -1e5;
    let present = false;
    let started = false;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      txp = e.clientX - rect.left;
      typ = e.clientY - rect.top;
      present = true;
    };
    const onLeave = () => {
      present = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);
    document.documentElement.addEventListener('pointerleave', onLeave);

    let mx = 0;
    let my = 0;
    let s = 0;
    const t0 = performance.now();
    const state: EngineState = {};
    const render = RENDERERS[pattern];

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || w === 0 || h === 0) return;
      if (present && !started) {
        // First contact: snap to the pointer instead of easing in from (0,0).
        mx = txp;
        my = typ;
        started = true;
      }
      mx += (txp - mx) * 0.18;
      my += (typ - my) * 0.18;
      s += ((present ? 1 : 0) - s) * 0.06;
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      render({ ctx, w, h, t, mx, my, s, R, tk }, state);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [pattern]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      style={{ maskImage: MASK, WebkitMaskImage: MASK, ...style }}
    />
  );
}
