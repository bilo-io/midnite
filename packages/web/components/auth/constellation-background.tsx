'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * Login-hero backdrop: a galaxy-like starfield that periodically lights up small
 * constellations as knowledge-graph edges — a visual echo of what midnite is (a
 * live graph of tasks/agents/repos). Stars scatter with a radial density falloff
 * around one off-centre galactic core (denser at the core, thinning outward),
 * twinkle on their own phase, and a few read as brighter anchors.
 *
 * Every ~few seconds 2–3 overlapping constellations pick a random cluster of
 * nearby stars, light them, draw the connection edges between them (fading in and
 * out over ~1–2s), then respawn elsewhere — an ever-changing graph. Edge/node
 * colours reuse the `--node-trigger` / `--node-action` / `--node-logic` /
 * `--node-data` tokens (the same four the app's canvas backgrounds read), so it
 * literally renders midnite's node palette and re-tints on theme/accent switch.
 *
 * Motion gating lives with the caller (see `useAnimationPrefs`): pass
 * `animate={false}` for the reduced-motion path and the canvas paints **once** —
 * a static star field plus a few pre-lit constellation edges, no twinkle, no RAF.
 * Purely decorative (`aria-hidden`, `pointer-events-none`); it never blocks the
 * form and is safe to mount after the page is interactive.
 */

const TAU = Math.PI * 2;

/** Soft star white (with a faint cool tint) — the hero panel is always deep-space dark. */
const STAR_HSL = '222 40% 92%';

type NodeColors = [string, string, string, string];

type Star = {
  /** Position as a fraction of the canvas, so a resize re-scales without reseeding. */
  fx: number;
  fy: number;
  /** Base radius (px) + base alpha. */
  r: number;
  a: number;
  /** Twinkle speed + phase; `bright` stars read as anchors. */
  tw: number;
  ph: number;
  bright: boolean;
};

type Constellation = {
  /** Indices into the star array. */
  members: number[];
  /** Edges as pairs of star indices. */
  edges: [number, number][];
  /** Which node token this constellation is drawn in. */
  colorIdx: 0 | 1 | 2 | 3;
  /** Birth time (seconds) + total lifetime (seconds). */
  born: number;
  life: number;
};

/** Deterministic PRNG (mulberry32) so the seeded star field is stable across frames/resizes. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readNodeColors(): NodeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return [
    v('--node-trigger', '38 92% 50%'),
    v('--node-action', '217 91% 60%'),
    v('--node-logic', '280 65% 60%'),
    v('--node-data', '142 71% 45%'),
  ];
}

/**
 * Seed the star field: most stars cluster around one off-centre galactic core with
 * a radius^1.7 density bias (denser at the core), plus a thin uniform dust layer so
 * the corners aren't empty.
 */
function seedStars(count: number): Star[] {
  const rnd = mulberry32(0x9e3779b9);
  const coreX = 0.64;
  const coreY = 0.4;
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const dust = rnd() < 0.22;
    let fx: number;
    let fy: number;
    if (dust) {
      fx = rnd();
      fy = rnd();
    } else {
      // Bias toward the core: radius^1.7 pulls the distribution inward.
      const ang = rnd() * TAU;
      const rad = Math.pow(rnd(), 1.7) * 0.62;
      fx = coreX + Math.cos(ang) * rad;
      fy = coreY + Math.sin(ang) * rad * 0.82;
    }
    const bright = rnd() > 0.94;
    stars.push({
      fx,
      fy,
      r: bright ? 1.6 + rnd() * 0.9 : 0.5 + rnd() * 1.0,
      a: bright ? 0.85 : 0.28 + rnd() * 0.4,
      tw: 0.5 + rnd() * 1.6,
      ph: rnd() * TAU,
      bright,
    });
  }
  return stars;
}

/**
 * Build a small connected graph from a random anchor + its nearest neighbours (in
 * px space): connect the anchor to each neighbour and chain consecutive neighbours,
 * yielding ~members edges — a little constellation.
 */
function spawnConstellation(
  stars: Star[],
  px: number[],
  py: number[],
  colorIdx: 0 | 1 | 2 | 3,
  born: number,
): Constellation {
  const anchor = Math.floor(Math.random() * stars.length);
  const k = 3 + Math.floor(Math.random() * 3); // 3–5 neighbours
  const near = stars
    .map((_, i) => i)
    .filter((i) => i !== anchor)
    .sort((i, j) => {
      const di = (px[i]! - px[anchor]!) ** 2 + (py[i]! - py[anchor]!) ** 2;
      const dj = (px[j]! - px[anchor]!) ** 2 + (py[j]! - py[anchor]!) ** 2;
      return di - dj;
    })
    .slice(0, k);
  const members = [anchor, ...near];
  const edges: [number, number][] = near.map((n) => [anchor, n]);
  // Chain a couple of neighbours together so it reads as a graph, not a star burst.
  for (let i = 0; i < near.length - 1; i += 2) {
    edges.push([near[i]!, near[i + 1]!]);
  }
  return { members, edges, colorIdx, born, life: 2.4 + Math.random() * 1.6 };
}

/** Envelope: 0 → 1 → 0 over the constellation's lifetime, with smooth ends. */
function envelope(age: number, life: number): number {
  const t = age / life;
  if (t <= 0 || t >= 1) return 0;
  const ramp = 0.28;
  const e = t < ramp ? t / ramp : t > 1 - ramp ? (1 - t) / ramp : 1;
  return e * e * (3 - 2 * e);
}

export function ConstellationBackground({
  animate,
  className,
  style,
}: {
  animate: boolean;
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
    let stars: Star[] = [];
    let px: number[] = [];
    let py: number[] = [];

    const reseed = () => {
      const count = Math.min(230, Math.max(90, Math.round((w * h) / 5200)));
      stars = seedStars(count);
      px = stars.map((s) => s.fx * w);
      py = stars.map((s) => s.fy * h);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      reseed();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let nodes = readNodeColors();
    const mo = new MutationObserver(() => {
      nodes = readNodeColors();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-accent', 'data-accent-2'],
    });

    const drawStars = (t: number) => {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]!;
        const twinkle = animate ? 0.6 + 0.4 * Math.sin(t * s.tw + s.ph) : 1;
        const a = s.a * twinkle;
        const r = s.r * (s.bright ? 0.9 + 0.2 * twinkle : 1);
        ctx.beginPath();
        ctx.fillStyle = `hsl(${STAR_HSL} / ${a.toFixed(3)})`;
        ctx.arc(px[i]!, py[i]!, r, 0, TAU);
        ctx.fill();
      }
    };

    const drawConstellation = (c: Constellation, alpha: number) => {
      if (alpha <= 0.001) return;
      const color = nodes[c.colorIdx];
      // Edges first, then relight the member stars on top.
      ctx.lineWidth = 1;
      ctx.strokeStyle = `hsl(${color} / ${(alpha * 0.5).toFixed(3)})`;
      ctx.beginPath();
      for (const [a, b] of c.edges) {
        ctx.moveTo(px[a]!, py[a]!);
        ctx.lineTo(px[b]!, py[b]!);
      }
      ctx.stroke();
      for (const m of c.members) {
        const glow = ctx.createRadialGradient(px[m]!, py[m]!, 0, px[m]!, py[m]!, 7);
        glow.addColorStop(0, `hsl(${color} / ${(alpha * 0.9).toFixed(3)})`);
        glow.addColorStop(1, `hsl(${color} / 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(px[m]! - 7, py[m]! - 7, 14, 14);
        ctx.beginPath();
        ctx.fillStyle = `hsl(${color} / ${alpha.toFixed(3)})`;
        ctx.arc(px[m]!, py[m]!, 1.7, 0, TAU);
        ctx.fill();
      }
    };

    // ── Static (reduced-motion) path: paint once and stop ──────────────────────
    if (!animate) {
      ctx.clearRect(0, 0, w, h);
      drawStars(0);
      // A few pre-lit constellations so the graph identity survives with no motion.
      for (let i = 0; i < 3; i++) {
        drawConstellation(spawnConstellation(stars, px, py, (i % 4) as 0 | 1 | 2 | 3, 0), 0.9);
      }
      return () => {
        ro.disconnect();
        mo.disconnect();
      };
    }

    // ── Animated path ──────────────────────────────────────────────────────────
    const t0 = performance.now();
    // 3 overlapping constellations on staggered births, each in a distinct colour.
    let constellations: Constellation[] = [0, 1, 2].map((i) =>
      spawnConstellation(stars, px, py, (i % 4) as 0 | 1 | 2 | 3, -i * 0.9),
    );

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || w === 0 || h === 0) return;
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      drawStars(t);
      constellations = constellations.map((c, i) => {
        const age = t - c.born;
        if (age >= c.life) {
          // Respawn elsewhere, keeping the palette slot rotating.
          return spawnConstellation(stars, px, py, ((c.colorIdx + 1) % 4) as 0 | 1 | 2 | 3, t);
        }
        drawConstellation(c, envelope(age, c.life));
        return c;
      });
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      style={style}
    />
  );
}
