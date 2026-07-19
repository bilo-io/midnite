'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * The neuro-cloud backdrop — a dense, galaxy-like field of "neurons" that
 * periodically fire, sending pulses down winding multi-hop "thought paths" (a
 * visual echo of what midnite is: a live graph of tasks/agents/repos). Shared
 * across the app's showcase surfaces: the auth/login shell, the landing home
 * screen, and the screensaver. Neurons scatter with a radial density falloff
 * around one off-centre core, twinkle on their own phase, and a few read as
 * brighter anchors.
 *
 * Firing: every so often an anchor neuron sparks a branching thought path — a
 * chain of nearby neurons lit segment by segment as a bright pulse travels the
 * edges, each neuron flaring (a pulsating glow) as the signal arrives, then the
 * whole path slowly fades. Most thoughts stay short; some run long (rarely up
 * to ~40 nodes), and some fork partway — the pulse splits into two diverging
 * chains. On top of the steady baseline, extra thoughts fire spontaneously
 * (~3–4 every 10s), and ambient mini-vortexes occasionally gather nearby
 * neurons, drift a little, and release a small shockwave plus a little
 * constellation burst from their centre — a weaker, tighter version of the
 * pointer's hold-and-release. Constellation bursts also fire on their own now
 * and then, at uniformly random points across the whole galaxy. A sparse
 * subset of neurons also glints now and then (a brief flare over the base
 * twinkle).
 * Edge/node colours reuse the `--node-trigger` /
 * `--node-action` / `--node-logic` / `--node-data` tokens (the same four the
 * app's canvas backgrounds read), so it literally renders midnite's node palette
 * and re-tints on theme/accent switch.
 *
 * Interaction (animated mode only; the canvas itself stays `pointer-events-none`
 * — listeners live on `window`, so the form is never blocked):
 *   - Passive hover is a *subtle* gravity well: nearby neurons lean in and
 *     drift into a soft orbit; a core repulsion keeps them from ever reaching
 *     the centre (a little black hole), and a home-spring pulls them back when
 *     the cursor moves on.
 *   - Holding the mouse button *gathers*: the well strengthens, and neurons
 *     drawn within the capture radius are kept — they detach from their home
 *     springs and swirl with the cursor as it moves.
 *   - Releasing detonates the shockwave (an invisible pressure wave — no drawn
 *     ring) that flings the captured neurons outward, and *excites* thought
 *     paths radiating from the release point — the more neurons captured, the
 *     more thoughts fire. They decay slowly.
 *
 * Motion gating lives with the caller (`useAnimationPrefs` / `useDynamicBackground`):
 * pass `animate={false}` for the reduced-motion path and the canvas paints
 * **once** — a static field plus a few pre-lit thought paths, no twinkle, no
 * physics, no RAF, no listeners. Purely decorative (`aria-hidden`,
 * `pointer-events-none`); it never blocks content and is safe to mount after the
 * page is interactive.
 */

const TAU = Math.PI * 2;

/** Fallback star colour before the theme token resolves — the neutral foreground
 *  (no blue tint), matching the `bg-dots` pattern rather than a cool white. */
const STAR_FALLBACK = '0 0% 90%';

type NodeColors = [string, string, string, string];

type Star = {
  /** Home position as a fraction of the canvas, so a resize re-scales without reseeding. */
  fx: number;
  fy: number;
  /** Base radius (px) + base alpha. */
  r: number;
  a: number;
  /** Twinkle speed + phase; `bright` stars read as anchors. */
  tw: number;
  ph: number;
  bright: boolean;
  /** Sparse subset that occasionally glints — a brief flare over the base twinkle. */
  sparkle: boolean;
};

/** A firing thought path: a chain of neuron indices lit by a travelling pulse. */
type Pathway = {
  nodes: number[];
  colorIdx: 0 | 1 | 2 | 3;
  /** Birth time (seconds), total lifetime (seconds), pulse speed (segments/s). */
  born: number;
  life: number;
  speed: number;
  /** Click-born paths decay slowly instead of the ambient in/out envelope. */
  click: boolean;
};

/** Per-wave strength/reach so pointer releases and ambient vortexes differ. */
type Shockwave = { x: number; y: number; born: number; kick: number; speed: number; decay: number };

/** An ambient vortex: gathers nearby neurons while drifting, then releases. */
type Vortex = { x: number; y: number; dx: number; dy: number; born: number; hold: number };

// ── Tuning ────────────────────────────────────────────────────────────────────
const WELL_RADIUS = 280; // px — reach of the cursor gravity well
const HOVER_PULL = 320; // subtle passive well: radial attraction (px/s²)
const HOVER_SWIRL = 260; // …and its tangential (orbit) acceleration
const HOLD_PULL = 1500; // button-down gathering pull (captured neurons follow)
const HOLD_SWIRL = 1000; // …and its swirl
const CAPTURE_RADIUS = 150; // px — neurons this close while held become captured
const WELL_CORE = 38; // px — hard core: inside this, neurons are pushed out
const CORE_PUSH = 3200;
const SPRING = 6; // home spring (s⁻²)
const DAMPING = 2.4; // velocity damping (s⁻¹)
const MAX_SPEED = 340; // px/s
const SW_SPEED = 430; // shockwave front speed (px/s)
const SW_LIFE = 1.5; // seconds
const SW_KICK = 1200; // shockwave impulse strength (invisible — pure physics)
const SW_DECAY = 0.7; // s — how fast the wave's push fades (sets the blast radius)
const MAX_PATHWAYS = 32;
// Ambient vortexes — smaller, weaker cousins of the pointer gather/release:
// tighter reach, gentler pull, and a softer shockwave that dies out closer in.
const VORTEX_RADIUS = 130; // px — reach of an ambient vortex (vs 280 pointer well)
const VORTEX_PULL = 900;
const VORTEX_SWIRL = 700;
const VORTEX_CORE = 26; // px — same event-horizon trick as the pointer well
const VORTEX_SW_KICK = 500; // vs 1200 for a pointer release
const VORTEX_SW_SPEED = 300; // px/s — vs 430
const VORTEX_SW_DECAY = 0.4; // the small blast fades out much sooner
const MAX_VORTEXES = 2;

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

/** Star colour follows the theme's neutral `--foreground` token (the same colour
 *  the `bg-dots` pattern draws), so the field re-tints light↔dark instead of being
 *  a fixed cool white and carries no blue cast. */
function readStarColor(): string {
  const cs = getComputedStyle(document.documentElement);
  return cs.getPropertyValue('--foreground').trim() || STAR_FALLBACK;
}

/**
 * Seed the field: most neurons cluster around one off-centre core with a
 * radius^1.7 density bias (denser at the core), plus a thin uniform dust layer so
 * the corners aren't empty.
 */
function seedStars(count: number): Star[] {
  const rnd = mulberry32(0x9e3779b9);
  const coreX = 0.64;
  const coreY = 0.4;
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const dust = rnd() < 0.26;
    let fx: number;
    let fy: number;
    if (dust) {
      fx = rnd();
      fy = rnd();
    } else {
      // Bias toward the core: radius^1.4 pulls the distribution inward (gentler
      // than the old ^1.7 — at 5× density a tighter bias reads as a hard blob).
      const ang = rnd() * TAU;
      const rad = Math.pow(rnd(), 1.4) * 0.72;
      fx = coreX + Math.cos(ang) * rad;
      fy = coreY + Math.sin(ang) * rad * 0.82;
    }
    const bright = rnd() > 0.94;
    stars.push({
      fx,
      fy,
      r: bright ? 1.6 + rnd() * 0.9 : 0.45 + rnd() * 0.9,
      a: bright ? 0.85 : 0.22 + rnd() * 0.38,
      tw: 0.5 + rnd() * 1.6,
      ph: rnd() * TAU,
      bright,
      sparkle: rnd() < 0.15,
    });
  }
  return stars;
}

/** Envelope: 0 → 1 → 0 over a lifetime, with smooth ends (ambient pathways). */
function envelope(age: number, life: number): number {
  const t = age / life;
  if (t <= 0 || t >= 1) return 0;
  const ramp = 0.28;
  const e = t < ramp ? t / ramp : t > 1 - ramp ? (1 - t) / ramp : 1;
  return e * e * (3 - 2 * e);
}

export function NeuroCloudBackground({
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
    // Parallel physics arrays (hot path — avoids per-star object churn):
    // home px, current px, velocity.
    let hx: number[] = [];
    let hy: number[] = [];
    let px: number[] = [];
    let py: number[] = [];
    let vx: number[] = [];
    let vy: number[] = [];
    // Cursor state (animated mode wires the listeners; declared here so the
    // shared draw helpers can read them without TDZ issues on the static path).
    let mouse: { x: number; y: number } | null = null;
    let held = false;
    // Neuron indices currently gathered by the held cursor (kept until release).
    const capturedSet = new Set<number>();
    // Set by the static path so a resize / theme change repaints the frozen frame
    // (the animated path repaints every RAF tick, so it leaves this null).
    let repaint: (() => void) | null = null;

    const reseed = () => {
      // ~6× the old galaxy density (a 25% bump over the last one), capped for perf.
      const count = Math.min(1440, Math.max(500, Math.round((w * h) / 840)));
      stars = seedStars(count);
      hx = stars.map((s) => s.fx * w);
      hy = stars.map((s) => s.fy * h);
      px = [...hx];
      py = [...hy];
      vx = new Array<number>(stars.length).fill(0);
      vy = new Array<number>(stars.length).fill(0);
      capturedSet.clear(); // indices are re-dealt on reseed
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
      repaint?.();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let nodes = readNodeColors();
    let starColor = readStarColor();
    const mo = new MutationObserver(() => {
      nodes = readNodeColors();
      starColor = readStarColor();
      repaint?.();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-accent', 'data-accent-2'],
    });

    /**
     * Grow a winding chain of nearby neurons from `start`, biased along `dir`
     * (thought paths radiate rather than double back). Greedy nearest-with-bias
     * over current positions; O(len·n) only at spawn time.
     */
    const buildChain = (
      start: number,
      dirX: number,
      dirY: number,
      len: number,
      rnd: () => number,
      avoid?: ReadonlySet<number>,
    ): number[] => {
      const chain = [start];
      const used = new Set<number>(avoid);
      used.add(start);
      let cx = px[start]!;
      let cy = py[start]!;
      let dx = dirX;
      let dy = dirY;
      const maxHop = 110;
      for (let step = 1; step < len; step++) {
        let best = -1;
        let bestScore = Infinity;
        for (let i = 0; i < stars.length; i++) {
          if (used.has(i)) continue;
          const ox = px[i]! - cx;
          const oy = py[i]! - cy;
          const d2 = ox * ox + oy * oy;
          if (d2 > maxHop * maxHop || d2 < 16) continue;
          const d = Math.sqrt(d2);
          // Directional bias: hops along `dir` score better than reversals.
          const dot = (ox / d) * dx + (oy / d) * dy;
          const score = d * (1.7 - dot) * (0.8 + rnd() * 0.4);
          if (score < bestScore) {
            bestScore = score;
            best = i;
          }
        }
        if (best < 0) break;
        const stepX = px[best]! - cx;
        const stepY = py[best]! - cy;
        const stepD = Math.hypot(stepX, stepY) || 1;
        // Blend the heading so the path winds smoothly instead of zig-zagging.
        dx = dx * 0.45 + (stepX / stepD) * 0.55;
        dy = dy * 0.45 + (stepY / stepD) * 0.55;
        const dl = Math.hypot(dx, dy) || 1;
        dx /= dl;
        dy /= dl;
        cx = px[best]!;
        cy = py[best]!;
        chain.push(best);
        used.add(best);
      }
      return chain;
    };

    /**
     * Thought length: most chains stay short (5–9), a fair share stretch
     * longer, and a rare few run epic — up to 40 nodes.
     */
    const thoughtLength = (rnd: () => number): number => {
      const roll = rnd();
      if (roll < 0.75) return 5 + Math.floor(rnd() * 5); // 5–9
      if (roll < 0.93) return 10 + Math.floor(rnd() * 12); // 10–21
      return 22 + Math.floor(rnd() * 19); // 22–40
    };

    const spawnAmbient = (born: number, colorIdx: 0 | 1 | 2 | 3, rnd: () => number): Pathway => {
      const start = Math.floor(rnd() * stars.length);
      const ang = rnd() * TAU;
      const chain = buildChain(start, Math.cos(ang), Math.sin(ang), thoughtLength(rnd), rnd);
      // Long thoughts pulse a touch faster, and live long enough for the pulse
      // to reach the end and fade rather than dying mid-chain.
      const speed = 2.6 + rnd() * 1.6 + chain.length * 0.05;
      return {
        nodes: chain,
        colorIdx,
        born,
        life: Math.max(3 + rnd() * 1.6, (chain.length - 1) / speed + 2),
        speed,
        click: false,
      };
    };

    /**
     * Occasionally fork a thought: from a node 25–75% along the parent, grow a
     * second chain veering off the parent's heading. The fork's pulse starts
     * when the parent's pulse reaches the branch node, so it reads as one
     * signal splitting in two.
     */
    const maybeBranch = (parent: Pathway, rnd: () => number): Pathway[] => {
      if (parent.nodes.length < 8 || rnd() > 0.3) return [];
      const k = Math.max(1, Math.floor(parent.nodes.length * (0.25 + rnd() * 0.5)));
      const at = parent.nodes[k]!;
      const prev = parent.nodes[k - 1]!;
      let dirX = px[at]! - px[prev]!;
      let dirY = py[at]! - py[prev]!;
      const hd = Math.hypot(dirX, dirY) || 1;
      dirX /= hd;
      dirY /= hd;
      // Veer ~30–70° off the parent's heading, either side.
      const rot = (0.55 + rnd() * 0.65) * (rnd() < 0.5 ? -1 : 1);
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const len = Math.max(4, Math.round((parent.nodes.length - k) * (0.6 + rnd() * 0.6)));
      const chain = buildChain(
        at,
        dirX * cos - dirY * sin,
        dirX * sin + dirY * cos,
        len,
        rnd,
        new Set(parent.nodes),
      );
      if (chain.length < 3) return [];
      const speed = parent.speed * (0.85 + rnd() * 0.3);
      return [
        {
          nodes: chain,
          colorIdx: parent.colorIdx,
          born: parent.born + k / parent.speed,
          life: Math.max(2.5, (chain.length - 1) / speed + 2),
          speed,
          click: parent.click,
        },
      ];
    };

    const drawStars = (t: number) => {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]!;
        const twinkle = animate ? 0.6 + 0.4 * Math.sin(t * s.tw + s.ph) : 1;
        // Sparse glints: a sine raised to a high power sits near zero for most
        // of its (slow) period, then briefly spikes — an occasional subtle flare.
        const glint =
          animate && s.sparkle
            ? Math.pow(0.5 + 0.5 * Math.sin(t * s.tw * 0.35 + s.ph * 4.7), 8)
            : 0;
        // Gathered neurons burn brighter while the cursor holds them.
        const gathered = held && capturedSet.has(i);
        const a = Math.min(1, (s.a * twinkle + 0.35 * glint) * (gathered ? 1.8 : 1));
        const r =
          s.r * (s.bright ? 0.9 + 0.2 * twinkle : 1) * (gathered ? 1.25 : 1) * (1 + glint * 0.5);
        // Gentle idle drift layered over the physics so the cloud never sits still.
        const dxi = animate ? Math.sin(t * 0.31 + s.ph * 2.1) * 1.6 : 0;
        const dyi = animate ? Math.cos(t * 0.24 + s.ph * 1.7) * 1.6 : 0;
        const x = px[i]! + dxi;
        const y = py[i]! + dyi;
        ctx.beginPath();
        ctx.fillStyle = `hsl(${starColor} / ${a.toFixed(3)})`;
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        if (s.bright) {
          // Cheap halo for anchors (no gradient): one large, faint disc.
          ctx.beginPath();
          ctx.fillStyle = `hsl(${starColor} / ${(a * 0.12).toFixed(3)})`;
          ctx.arc(x, y, r * 3.2, 0, TAU);
          ctx.fill();
        }
      }
    };

    /** Draw one thought path at time `t`; returns false once fully decayed. */
    const drawPathway = (p: Pathway, t: number): boolean => {
      const age = t - p.born;
      if (age < 0) return true;
      const decay = p.click
        ? Math.pow(Math.max(0, 1 - age / p.life), 1.5) // slow ember fade
        : envelope(age, p.life);
      if (age >= p.life || decay <= 0.001) return false;
      const segs = p.nodes.length - 1;
      if (segs < 1) return false;
      const progress = age * p.speed;
      const color = nodes[p.colorIdx];

      // Edges light segment by segment as the pulse travels.
      ctx.lineWidth = 1;
      for (let i = 0; i < segs; i++) {
        const lit = Math.min(1, Math.max(0, progress - i));
        if (lit <= 0) break;
        const ax = px[p.nodes[i]!]!;
        const ay = py[p.nodes[i]!]!;
        const bx = px[p.nodes[i + 1]!]!;
        const by = py[p.nodes[i + 1]!]!;
        ctx.strokeStyle = `hsl(${color} / ${(0.55 * lit * decay).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + (bx - ax) * lit, ay + (by - ay) * lit);
        ctx.stroke();
      }

      // Neurons flare as the pulse arrives, then linger with a soft pulsating glow.
      for (let j = 0; j < p.nodes.length; j++) {
        const phase = progress - j;
        if (phase < 0) break;
        const flash = Math.exp(-phase * 1.6);
        const glowA = (0.3 + 0.7 * flash) * decay * (0.85 + 0.15 * Math.sin(t * 5 + j));
        if (glowA <= 0.01) continue;
        const gx = px[p.nodes[j]!]!;
        const gy = py[p.nodes[j]!]!;
        const gr = 7 + 5 * flash;
        const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        glow.addColorStop(0, `hsl(${color} / ${(glowA * 0.9).toFixed(3)})`);
        glow.addColorStop(1, `hsl(${color} / 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
        ctx.beginPath();
        ctx.fillStyle = `hsl(${color} / ${Math.min(1, glowA * 1.2).toFixed(3)})`;
        ctx.arc(gx, gy, 1.7, 0, TAU);
        ctx.fill();
      }

      // The travelling pulse itself — a bright bead sliding along the live edge.
      if (progress > 0 && progress < segs) {
        const i = Math.floor(progress);
        const f = progress - i;
        const ax = px[p.nodes[i]!]!;
        const ay = py[p.nodes[i]!]!;
        const bx = px[p.nodes[i + 1]!]!;
        const by = py[p.nodes[i + 1]!]!;
        const sx = ax + (bx - ax) * f;
        const sy = ay + (by - ay) * f;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
        glow.addColorStop(0, `hsl(${color} / ${(0.95 * decay).toFixed(3)})`);
        glow.addColorStop(1, `hsl(${color} / 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 10, sy - 10, 20, 20);
      }
      return true;
    };

    // ── Static (reduced-motion) path: paint one frame, repaint on resize/theme ──
    if (!animate) {
      const paintStatic = () => {
        ctx.clearRect(0, 0, w, h);
        drawStars(0);
        // A few pre-lit thought paths so the graph identity survives with no
        // motion — seeded per-slot so they stay put across repaints. `born` is
        // pushed far into the past so every segment/node renders fully lit
        // (progress > segs) under a mid-life ambient envelope.
        for (let i = 0; i < 3; i++) {
          const seeded = mulberry32(0x51ed + i * 0x2545);
          const p = spawnAmbient(0, (i % 4) as 0 | 1 | 2 | 3, seeded);
          p.born = -p.life / 2;
          p.speed = 1000; // fully lit instantly
          drawPathway(p, 0);
        }
      };
      repaint = paintStatic;
      paintStatic();
      return () => {
        ro.disconnect();
        mo.disconnect();
      };
    }

    // ── Animated path ──────────────────────────────────────────────────────────
    const t0 = performance.now();
    const now = () => (performance.now() - t0) / 1000;

    let pathways: Pathway[] = [0, 1, 2].map((i) =>
      spawnAmbient(-i * 0.9, (i % 4) as 0 | 1 | 2 | 3, Math.random),
    );
    let nextColor = 3;
    let nextAmbientAt = 0;
    // Extra spontaneous firings on top of the ambient baseline (~3–4 per 10s).
    let nextSpontaneousAt = 1.5 + Math.random() * 2;
    let shockwaves: Shockwave[] = [];
    // Ambient vortexes: spontaneous little gather/release cycles, independent
    // of the pointer — each drifts slightly while it gathers, then detonates a
    // small shockwave (a miniature of the pointer's hold-and-release).
    let vortexes: Vortex[] = [];
    let nextVortexAt = 4 + Math.random() * 6;
    // Spontaneous constellations: the release burst, unprompted, anywhere in the galaxy.
    let nextConstellationAt = 6 + Math.random() * 6;

    /**
     * Spark a constellation: `n` thought paths radiating outward from a point,
     * each seeded from a nearby neuron (or from `seeds` when a gathered swarm
     * provides them). The burst a pointer release fires — reused by ambient
     * vortex releases and the spontaneous galaxy-wide firings.
     */
    const sparkConstellation = (cx: number, cy: number, t: number, n: number, seeds?: number[]) => {
      const starts =
        seeds && seeds.length > 0
          ? seeds
          : stars
              .map((_, i) => i)
              .sort((a, b) => {
                const da = (px[a]! - cx) ** 2 + (py[a]! - cy) ** 2;
                const db = (px[b]! - cx) ** 2 + (py[b]! - cy) ** 2;
                return da - db;
              })
              .slice(0, n * 3);
      for (let k = 0; k < n; k++) {
        const start = starts[Math.floor((k / n) * starts.length)]!;
        let ox = px[start]! - cx;
        let oy = py[start]! - cy;
        const d = Math.hypot(ox, oy);
        if (d < 1) {
          const ang = (k / n) * TAU;
          ox = Math.cos(ang);
          oy = Math.sin(ang);
        } else {
          ox /= d;
          oy /= d;
        }
        const p: Pathway = {
          nodes: buildChain(start, ox, oy, 6 + Math.floor(Math.random() * 4), Math.random),
          colorIdx: (nextColor++ % 4) as 0 | 1 | 2 | 3,
          born: t,
          life: 5.5 + Math.random() * 2,
          speed: 4.5,
          click: true,
        };
        pathways.push(p, ...maybeBranch(p, Math.random));
      }
      if (pathways.length > MAX_PATHWAYS) pathways = pathways.slice(-MAX_PATHWAYS);
    };

    // Cursor gravity well + press-to-gather. The canvas stays
    // pointer-events-none, so listeners live on window and map into canvas space.
    const toLocal = (e: PointerEvent): { x: number; y: number } | null => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? { x, y } : null;
    };
    const onMove = (e: PointerEvent) => {
      const at = toLocal(e);
      // While gathering, keep the last in-bounds position so the swarm doesn't
      // drop the moment the pointer grazes the canvas edge.
      if (at) mouse = at;
      else if (!held) mouse = null;
    };
    const onLeave = () => {
      if (!held) mouse = null;
    };
    const onDown = (e: PointerEvent) => {
      const at = toLocal(e);
      if (!at) return;
      mouse = at;
      held = true;
    };
    // Release: fling the gathered neurons outward (the shockwave — pure
    // physics, no drawn ring) and fire thought paths from the release point;
    // the bigger the catch, the more thoughts.
    const onUp = () => {
      if (!held) return;
      held = false;
      const at = mouse;
      const seeds = [...capturedSet];
      capturedSet.clear();
      if (!at) return;
      const t = now();
      shockwaves.push({ x: at.x, y: at.y, born: t, kick: SW_KICK, speed: SW_SPEED, decay: SW_DECAY });
      for (const i of seeds) {
        const ox = px[i]! - at.x;
        const oy = py[i]! - at.y;
        const d = Math.hypot(ox, oy) || 1;
        const kick = 300 + Math.random() * 240;
        vx[i] = vx[i]! + (ox / d) * kick;
        vy[i] = vy[i]! + (oy / d) * kick;
      }
      // Path count scales with the catch (a bare click still sparks a couple);
      // seed from the captured swarm when there is one, else the nearest stars.
      const nPaths = Math.min(10, Math.max(2, Math.round(seeds.length / 12)));
      sparkConstellation(at.x, at.y, t, nPaths, seeds.length > 0 ? seeds : undefined);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointerout', onLeave, { passive: true });

    const step = (t: number, dt: number) => {
      for (let i = 0; i < stars.length; i++) {
        const gathered = held && mouse != null && capturedSet.has(i);
        // Captured neurons detach from their home spring — they belong to the
        // cursor until release.
        let ax = gathered ? 0 : (hx[i]! - px[i]!) * SPRING;
        let ay = gathered ? 0 : (hy[i]! - py[i]!) * SPRING;

        if (mouse) {
          const mx = mouse.x - px[i]!;
          const my = mouse.y - py[i]!;
          const d = Math.hypot(mx, my);
          if (gathered && d > 0.5) {
            // Follow the cursor from any distance; the core keeps the swarm a
            // swirling ball rather than a point.
            const ux = mx / d;
            const uy = my / d;
            ax += ux * HOLD_PULL;
            ay += uy * HOLD_PULL;
            ax += -uy * HOLD_SWIRL;
            ay += ux * HOLD_SWIRL;
            if (d < WELL_CORE) {
              const push = CORE_PUSH * (1 - d / WELL_CORE);
              ax -= ux * push;
              ay -= uy * push;
            }
          } else if (d < WELL_RADIUS && d > 0.5) {
            const q = 1 - d / WELL_RADIUS;
            const f = q * q;
            const ux = mx / d;
            const uy = my / d;
            // Passive hover leans in gently; holding the button gathers hard.
            const pull = held ? HOLD_PULL : HOVER_PULL;
            const swirl = held ? HOLD_SWIRL : HOVER_SWIRL;
            ax += ux * pull * f;
            ay += uy * pull * f;
            ax += -uy * swirl * f;
            ay += ux * swirl * f;
            if (held && d < CAPTURE_RADIUS) capturedSet.add(i);
            if (d < WELL_CORE) {
              // Event horizon: nothing reaches the cursor itself.
              const push = CORE_PUSH * (1 - d / WELL_CORE);
              ax -= ux * push;
              ay -= uy * push;
            }
          }
        }

        // Ambient vortexes: a small, gentle version of the pointer well.
        for (const v of vortexes) {
          const mx = v.x - px[i]!;
          const my = v.y - py[i]!;
          const d = Math.hypot(mx, my);
          if (d < VORTEX_RADIUS && d > 0.5) {
            // Ease the well in so a fresh vortex doesn't jerk the field.
            const f = (1 - d / VORTEX_RADIUS) ** 2 * Math.min(1, (t - v.born) / 0.5);
            const ux = mx / d;
            const uy = my / d;
            ax += ux * VORTEX_PULL * f;
            ay += uy * VORTEX_PULL * f;
            ax += -uy * VORTEX_SWIRL * f;
            ay += ux * VORTEX_SWIRL * f;
            if (d < VORTEX_CORE) {
              const push = CORE_PUSH * (1 - d / VORTEX_CORE);
              ax -= ux * push;
              ay -= uy * push;
            }
          }
        }

        for (const sw of shockwaves) {
          const oxx = px[i]! - sw.x;
          const oyy = py[i]! - sw.y;
          const d = Math.hypot(oxx, oyy) || 1;
          const front = (t - sw.born) * sw.speed;
          const band = d - front;
          // Kick outward as the ring front sweeps past, fading with age.
          const k =
            sw.kick *
            Math.exp(-(band * band) / (2 * 42 * 42)) *
            Math.exp(-(t - sw.born) / sw.decay);
          ax += (oxx / d) * k;
          ay += (oyy / d) * k;
        }

        vx[i] = (vx[i]! + ax * dt) * Math.max(0, 1 - DAMPING * dt);
        vy[i] = (vy[i]! + ay * dt) * Math.max(0, 1 - DAMPING * dt);
        const sp2 = vx[i]! * vx[i]! + vy[i]! * vy[i]!;
        if (sp2 > MAX_SPEED * MAX_SPEED) {
          const sc = MAX_SPEED / Math.sqrt(sp2);
          vx[i]! *= sc;
          vy[i]! *= sc;
        }
        px[i] = px[i]! + vx[i]! * dt;
        py[i] = py[i]! + vy[i]! * dt;
      }
    };

    let last = performance.now();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || w === 0 || h === 0) {
        last = performance.now();
        return;
      }
      const t = now();
      const dt = Math.min(0.05, (performance.now() - last) / 1000);
      last = performance.now();

      // Ambient vortexes: drift while gathering, release a small shockwave, respawn.
      for (const v of vortexes) {
        v.x += v.dx * dt;
        v.y += v.dy * dt;
        if (t - v.born >= v.hold) {
          shockwaves.push({
            x: v.x,
            y: v.y,
            born: t,
            kick: VORTEX_SW_KICK,
            speed: VORTEX_SW_SPEED,
            decay: VORTEX_SW_DECAY,
          });
          // The release also sparks a small constellation from the vortex
          // centre — the pointer-release effect at ambient scale (2–3 paths
          // vs up to 10).
          sparkConstellation(v.x, v.y, t, 2 + Math.floor(Math.random() * 2));
        }
      }
      vortexes = vortexes.filter((v) => t - v.born < v.hold);
      if (vortexes.length < MAX_VORTEXES && t >= nextVortexAt) {
        const ang = Math.random() * TAU;
        vortexes.push({
          x: w * (0.12 + Math.random() * 0.76),
          y: h * (0.12 + Math.random() * 0.76),
          dx: Math.cos(ang) * (8 + Math.random() * 14),
          dy: Math.sin(ang) * (8 + Math.random() * 14),
          born: t,
          hold: 1.8 + Math.random() * 1.2,
        });
        nextVortexAt = t + 5 + Math.random() * 8;
      }

      step(t, dt);
      // The wave itself is invisible — only its push on the neurons shows.
      shockwaves = shockwaves.filter((sw) => t - sw.born < SW_LIFE);
      ctx.clearRect(0, 0, w, h);
      drawStars(t);
      pathways = pathways.filter((p) => drawPathway(p, t));
      // Keep a few ambient firings alive on a gentle stagger…
      const ambient = pathways.reduce((n, p) => n + (p.click ? 0 : 1), 0);
      if (ambient < 3 && t >= nextAmbientAt) {
        const p = spawnAmbient(t, (nextColor++ % 4) as 0 | 1 | 2 | 3, Math.random);
        pathways.push(p, ...maybeBranch(p, Math.random));
        nextAmbientAt = t + 0.5 + Math.random() * 1.2;
      }
      // …plus extra spontaneous firings on top of the baseline (~3–4 per 10s).
      if (t >= nextSpontaneousAt) {
        const p = spawnAmbient(t, (nextColor++ % 4) as 0 | 1 | 2 | 3, Math.random);
        pathways.push(p, ...maybeBranch(p, Math.random));
        nextSpontaneousAt = t + 2.2 + Math.random() * 1.4;
        if (pathways.length > MAX_PATHWAYS) pathways = pathways.slice(-MAX_PATHWAYS);
      }
      // …and, every so often, a whole constellation bursts at a uniformly
      // random point — anywhere in the galaxy, not biased toward the dense
      // core the way star-seeded spawns are.
      if (t >= nextConstellationAt) {
        sparkConstellation(Math.random() * w, Math.random() * h, t, 2 + Math.floor(Math.random() * 3));
        nextConstellationAt = t + 7 + Math.random() * 7;
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointerout', onLeave);
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
