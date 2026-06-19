'use client';

import { useEffect, useRef } from 'react';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// The default "orbit" spinner cycles through these phases. The sequence always
// returns to "orbit" between phases, so the eye keeps re-anchoring on the same
// shape. These are internal to the rAF animation — not the public `variant` prop.
type OrbitPhase = 'orbit' | 'ellipsis' | 'ring' | 'juggle' | 'bounce' | 'conveyor';
const ORBIT_SEQUENCE: OrbitPhase[] = [
  'orbit',
  'ellipsis',
  'orbit',
  'ring',
  'orbit',
  'juggle',
  'orbit',
  'bounce',
  'orbit',
  'conveyor',
];

const DWELL_MS = { orbit: 2200, other: 3600 } as const;
const BLEND_MS = 700; // cross-fade window between variants
const DOT_SIZE = 9;

type DotState = { x: number; y: number; o: number };

// Where dot `i` should sit at time `tSec` for a given variant. Crucially, orbit
// and ring share the exact same angular formula, so blending between them only
// moves the dots radially — no angular jump. All three are continuous functions
// of time, so there's nothing to "restart" when we switch.
function dotPosition(variant: OrbitPhase, i: number, tSec: number): DotState {
  if (variant === 'ellipsis') {
    const period = 1.3;
    const angle = ((tSec - i * 0.16) / period) * Math.PI * 2;
    const bounce = Math.max(0, Math.sin(angle));
    return { x: (i - 1) * 15, y: -11 * bounce, o: 0.4 + 0.6 * bounce };
  }
  if (variant === 'juggle') {
    // Treadmill of three dots: glide left→right along the bottom, then the one
    // that reaches the right edge arcs back over the top — a leapfrog loop.
    const period = 1.4;
    const bottomShare = 0.68; // fraction of the cycle spent on the bottom run
    const span = 16; // x reaches ±span; arc rises to `arc`
    const arc = 17;
    const p = (((tSec / period + i / 3) % 1) + 1) % 1;
    if (p < bottomShare) {
      const f = p / bottomShare;
      return { x: -span + 2 * span * f, y: 0, o: 1 };
    }
    const pp = (p - bottomShare) / (1 - bottomShare);
    return { x: span * Math.cos(Math.PI * pp), y: -arc * Math.sin(Math.PI * pp), o: 1 };
  }
  if (variant === 'bounce') {
    // A single bounce sweeps left→right across a row of three. Each dot's hop is
    // staggered by a third of the cycle and lasts exactly a third, so at any
    // instant one dot is airborne and the other two rest on the baseline — and
    // each touchdown hands straight off to the next dot, so the bounce travels.
    const period = 1.4;
    const spacing = 16;
    const arc = 20;
    const x = (i - 1) * spacing;
    const local = (((tSec / period - i / 3) % 1) + 1) % 1;
    const hopWindow = 1 / 3;
    const hop = local < hopWindow ? Math.sin((local / hopWindow) * Math.PI) : 0;
    return { x, y: -arc * hop, o: 1 };
  }
  if (variant === 'conveyor') {
    // Dots file in from the left, queue into a row at {-S, 0, +S}, then file out
    // to the right. Each dot tracks a piecewise-linear x path (lifted straight
    // from the reference keyframes); opacity is derived from how far off-centre
    // it has drifted, so it fades in/out at the edges and the off-screen wrap
    // (right edge → left edge) is invisible.
    const period = 1.3;
    const S = 18;
    const OFF = 44;
    const tracks: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
      [[0, -OFF], [0.3333, -OFF], [0.4, -S], [0.8333, -S], [1, OFF]],
      [[0, -OFF], [0.1667, -OFF], [0.3333, 0], [0.6667, 0], [0.8333, OFF], [1, OFF]],
      [[0, -OFF], [0.1667, S], [0.6, S], [0.6667, OFF], [1, OFF]],
    ];
    const track = tracks[i] ?? tracks[0]!;
    const u = (((tSec / period) % 1) + 1) % 1;
    let x = track[track.length - 1]?.[1] ?? OFF;
    for (let k = 0; k < track.length - 1; k += 1) {
      const a = track[k];
      const b = track[k + 1];
      if (!a || !b) continue;
      const [u0, x0] = a;
      const [u1, x1] = b;
      if (u >= u0 && u <= u1) {
        const f = u1 === u0 ? 0 : (u - u0) / (u1 - u0);
        x = x0 + (x1 - x0) * f;
        break;
      }
    }
    return { x, y: 0, o: clamp((OFF - Math.abs(x)) / (OFF - S), 0, 1) };
  }
  const angle = (tSec / 1.5) * Math.PI * 2 + i * ((Math.PI * 2) / 3);
  // ring: fixed radius; orbit: synced breathing radius. Min kept above DOT_SIZE/√3
  // so the dots never visually merge into a single white orb at the tightest point.
  const radius = variant === 'ring' ? 20 : 15 + 6 * Math.sin((tSec / 1.5) * Math.PI * 2);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, o: 1 };
}

function easeInOut(k: number): number {
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}

// Public spinner styles. "orbit" is the rAF-driven three-dot animation above;
// the rest are self-contained CSS loaders (keyframes live in globals.css and use
// the --foreground token so they track the theme).
export type SpinnerVariant = 'orbit' | 'breathe' | 'jitter' | 'tumble';

export function Spinner({ variant = 'orbit' }: { variant?: SpinnerVariant } = {}) {
  const dotsRef = useRef<Array<HTMLSpanElement | null>>([null, null, null]);

  useEffect(() => {
    if (variant !== 'orbit') return;
    const dots = dotsRef.current;

    // Reduced motion: lay the dots out statically and don't animate.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dots.forEach((el, i) => {
        if (!el) return;
        const a = i * ((Math.PI * 2) / 3);
        el.style.transform = `translate(${Math.cos(a) * 18}px, ${Math.sin(a) * 18}px)`;
        el.style.opacity = '1';
      });
      return;
    }

    const t0 = performance.now();
    let raf = 0;
    let stepIdx = 0;
    let prev: OrbitPhase = 'orbit';
    let target: OrbitPhase = 'orbit';
    let blendStart = -Infinity; // far in the past → start fully on `target`
    let nextSwitchAt = t0 + DWELL_MS.orbit;

    const frame = (now: number) => {
      const tSec = (now - t0) / 1000;

      if (now >= nextSwitchAt) {
        stepIdx = (stepIdx + 1) % ORBIT_SEQUENCE.length;
        prev = target;
        target = ORBIT_SEQUENCE[stepIdx] ?? 'orbit';
        blendStart = now;
        nextSwitchAt = now + (target === 'orbit' ? DWELL_MS.orbit : DWELL_MS.other);
      }

      const k = easeInOut(clamp((now - blendStart) / BLEND_MS, 0, 1));
      for (let i = 0; i < 3; i += 1) {
        const el = dots[i];
        if (!el) continue;
        const a = dotPosition(prev, i, tSec);
        const b = dotPosition(target, i, tSec);
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k;
        const o = a.o + (b.o - a.o) * k;
        el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
        el.style.opacity = o.toFixed(3);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [variant]);

  if (variant !== 'orbit') {
    return <div className={`spinner-${variant}`} role="status" aria-label="Working" />;
  }

  return (
    <div className="relative h-14 w-14" role="status" aria-label="Working">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          ref={(el) => {
            dotsRef.current[i] = el;
          }}
          className="absolute rounded-full bg-foreground"
          style={{
            height: DOT_SIZE,
            width: DOT_SIZE,
            left: '50%',
            top: '50%',
            marginLeft: -DOT_SIZE / 2,
            marginTop: -DOT_SIZE / 2,
            opacity: 0,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}

// Full-cell loading state for dashboard widgets: centres the spinner within the
// widget body so it sits in the middle of the grid cell regardless of panel size.
export function WidgetLoader({ variant }: { variant?: SpinnerVariant } = {}) {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner variant={variant} />
    </div>
  );
}
