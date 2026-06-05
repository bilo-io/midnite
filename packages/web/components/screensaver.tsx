'use client';

import { useEffect, useRef, useState } from 'react';
import { getSessions } from '@/lib/api';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';

// Playful phrases shown one at a time in the big title slot. Which set we draw
// from tracks what the agents are doing: at least one acting → ACTIVE; none
// acting but some awaiting input → WAITING; nothing on the board → IDLE.
const ACTIVE_WORDS = [
  'loading',
  'combobulating',
  'midnighting',
  'clauding',
  'vibing',
  'smashing',
  'crushing it',
  'orchestrating',
  'klapping',
  'thinking',
  'reticulating',
  'computing',
  'conjuring',
  'brewing',
  'percolating',
  'assembling',
  'compiling',
  'hydrating',
  'bundling',
  'fidgeting',
  'deploying',
  'tinkering',
  'wrangling',
  'noodling',
  'cooking',
  'simmering',
  'marinating',
  'hustling',
  'grinding',
  'flowing',
  'syncing',
  'aligning',
  'calibrating',
  'optimising',
  'refactoring',
  'untangling',
  'debugging',
  'parsing',
  'tokenizing',
  'embedding',
  'inferring',
  'reasoning',
  'pondering',
  'cogitating',
  'ruminating',
  'rick\'ing',
  'scheming',
  'plotting',
  'mapping',
  'charting',
  'sketching',
  'drafting',
  'prototyping',
  'iterating',
  'polishing',
  'buffing',
  'tidying',
  'sweeping',
  'gardening',
  'pruning',
  'harvesting',
  'gathering',
  'foraging',
  'mining',
  'prospecting',
  'excavating',
  'spelunking',
  'navigating',
  'wayfinding',
  'cruising',
  'gliding',
  'soaring',
  'rocketing',
  'warping',
  'teleporting',
  'materialising',
  'summoning',
  'enchanting',
  'bewitching',
  'mesmerising',
  'humming',
  'whirring',
  'buzzing',
  'crackling',
  'sparking',
  'igniting',
  'kindling',
  'glowing',
  'shimmering',
  'sparkling',
  'dazzling',
  'flexing',
  '"hey ho"\'ing',
  'leveling up',
  'powering up',
  'charging up',
  'gearing up',
  'limbering up',
  'warming up',
  'locking in',
  'dialing in',
  'getting after it',
];

// Nobody's acting, but work is parked awaiting your input — the agents idle.
const WAITING_WORDS = [
  'twiddling thumbs',
  'tumbleweeding',
  'watching ice melt',
  'watching grass grow',
  'watching paint dry',
  'counting ceiling tiles',
  'counting sheep',
  'humming elevator music',
  'whistling idly',
  'doodling margins',
  'staring into space',
  'cooling heels',
  'pacing the floor',
  'checking the clock',
  'twirling pens',
  'people-watching',
  'killing time',
  'biding time',
  'loitering',
  'lingering',
  'holding the line',
  'standing by',
  'awaiting orders',
  'awaiting your word',
  'spinning idle',
];

// Empty board — the agents are rested and itching for something to do.
const IDLE_WORDS = [
  'anticipating',
  'keen to roll',
  'wanna vibe?',
  'what\'s up?',
  'ready when you are',
  'itching to go',
  'raring to go',
  'champing at the bit',
  'all charged up',
  'fully rested',
  'fired up',
  'locked and loaded',
  'eager beaver',
  'queue me up',
  'feed me work',
  'point me at it',
  'give me something',
  'what’s next?',
  'tasks please',
  'hit me up',
  'let’s build',
  'let’s gooo',
  'let’s vibe',
  'let’s fucking go!',
  'ready to rumble',
  'craving chaos',
  'bored already',
  'idle hands',
];

type Mode = 'active' | 'waiting' | 'idle';

const WORD_SETS: Record<Mode, string[]> = {
  active: ACTIVE_WORDS,
  waiting: WAITING_WORDS,
  idle: IDLE_WORDS,
};

// Pick a random phrase index, avoiding an immediate repeat of the current one.
function nextRandomIndex(length: number, current: number): number {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

function modeFromCounts(counts: Counts | null): Mode {
  if (!counts || counts.actioning > 0) return 'active';
  if (counts.awaiting > 0) return 'waiting';
  return 'idle';
}

type Counts = { actioning: number; awaiting: number; complete: number };

const PILLS: Array<{ key: keyof Counts; label: string; hueVar: string }> = [
  { key: 'actioning', label: 'actioning', hueVar: '--status-wip' },
  { key: 'awaiting', label: 'awaiting', hueVar: '--status-waiting' },
  { key: 'complete', label: 'complete', hueVar: '--status-done' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Number of samples held in the CPU/RAM rolling charts.
const SERIES_LEN = 32;

function seedSeries(base: number): number[] {
  return Array.from({ length: SERIES_LEN }, () => clamp(base + (Math.random() - 0.5) * 18, 4, 96));
}

// Smooth random walk: drop the oldest sample, append a nudged new one.
function walkSeries(prev: number[], spread: number, lo: number, hi: number): number[] {
  const last = prev[prev.length - 1] ?? 50;
  return [...prev.slice(1), clamp(last + (Math.random() - 0.5) * spread, lo, hi)];
}

export function Screensaver({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * ACTIVE_WORDS.length));
  const [typed, setTyped] = useState('');
  const [counts, setCounts] = useState<Counts | null>(null);
  const mode = modeFromCounts(counts);
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

  // Corner widgets: live clock plus simulated system telemetry.
  const [now, setNow] = useState(() => new Date());
  const [cpu, setCpu] = useState<number[]>(() => seedSeries(38));
  const [ram, setRam] = useState<number[]>(() => seedSeries(56));
  const [quota, setQuota] = useState(() => clamp(58 + (Math.random() - 0.5) * 20, 35, 90));

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setCpu((prev) => walkSeries(prev, 22, 5, 96));
      setRam((prev) => walkSeries(prev, 9, 22, 92));
      setQuota((q) => clamp(q + (Math.random() - 0.42) * 1.4, 30, 97));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // When the agents' state changes, jump to a fresh phrase from the new set.
  useEffect(() => {
    setIndex(Math.floor(Math.random() * WORD_SETS[mode].length));
  }, [mode]);

  // Type the current word out, hold it for 2s, then advance to the next one.
  useEffect(() => {
    const set = WORD_SETS[mode];
    const word = set[index % set.length] ?? 'loading';
    let i = 0;
    let holdTimer: ReturnType<typeof setTimeout>;
    setTyped('');
    const typeTimer = setInterval(() => {
      i += 1;
      setTyped(word.slice(0, i));
      if (i >= word.length) {
        clearInterval(typeTimer);
        holdTimer = setTimeout(() => setIndex((n) => nextRandomIndex(set.length, n)), 2000);
      }
    }, 65);
    return () => {
      clearInterval(typeTimer);
      clearTimeout(holdTimer);
    };
  }, [index, mode]);

  // Pull live session counts and refresh periodically.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const sessions = await getSessions();
        if (cancelled) return;
        setCounts({
          actioning: sessions.filter((s) => s.status === 'running').length,
          awaiting: sessions.filter((s) => s.status === 'waiting').length,
          complete: sessions.filter((s) => s.status === 'completed').length,
        });
      } catch {
        if (!cancelled) setCounts({ actioning: 0, awaiting: 0, complete: 0 });
      }
    };
    void load();
    const id = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Any key or click dismisses.
  useEffect(() => {
    const onKey = () => onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const active = counts ? counts.actioning + counts.awaiting : 0;
  const poolSize = settings.agentPoolSize;
  const agentsPct = poolSize > 0 ? clamp((active / poolSize) * 100, 0, 100) : 0;

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const cpuNow = Math.round(cpu[cpu.length - 1] ?? 0);
  const ramNow = Math.round(ram[ram.length - 1] ?? 0);

  return (
    <div
      role="dialog"
      aria-label="Screensaver"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-background/90 px-6 text-center backdrop-blur-[120px]"
    >
      {/* Decorative grid on its own masked layer so its edge fade doesn't punch
          holes in the opaque, blurred backdrop above. */}
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />

      {/* ── Top-left: date ── */}
      <div className="absolute left-8 top-8 z-10 text-left">
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          {DAYS[now.getDay()]}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground tabular-nums">
          {now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}
        </div>
      </div>

      {/* ── Top-right: time ── */}
      <div className="absolute right-8 top-8 z-10 text-right">
        <div className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {time}
        </div>
        <div className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
          local time
        </div>
      </div>

      {/* ── Bottom-left: CPU & RAM ── */}
      <div className="absolute bottom-8 left-8 z-10 text-left">
        <div className="mb-2 flex items-center gap-4 text-xs">
          <LegendDot hueVar="--status-wip" label="CPU" value={cpuNow} />
          <LegendDot hueVar="--status-todo" label="RAM" value={ramNow} />
        </div>
        <AreaChart cpu={cpu} ram={ram} />
      </div>

      {/* ── Bottom-right: usage quotas ── */}
      <div className="absolute bottom-8 right-8 z-10 flex items-end gap-6">
        <Ring value={agentsPct} hueVar="--status-waiting" label="Agents" display={`${active}/${poolSize}`} />
        <Ring value={quota} hueVar="--status-done" label="Quota" display={`${Math.round(quota)}%`} />
      </div>

      {/* ── Center: spinner, cycling word, status pills ── */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-10">
          <Spinner />
        </div>

        <h1 className="flex items-baseline bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text pb-3 text-4xl font-semibold leading-[1.15] tracking-tight text-transparent sm:text-6xl">
          {typed}
          <span
            aria-hidden
            className="ml-0.5 inline-block w-[0.06em] self-stretch bg-foreground text-transparent animate-[blink_1s_step-end_infinite]"
          >
            |
          </span>
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {mode === 'active'
            ? `${counts?.actioning ?? 0} agent${counts?.actioning === 1 ? '' : 's'} hard at work`
            : mode === 'waiting'
              ? `${counts?.awaiting ?? 0} session${counts?.awaiting === 1 ? '' : 's'} awaiting your input`
              : 'all caught up — ready for more'}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          {PILLS.map(({ key, label, hueVar }) => {
            const n = counts ? counts[key] : 0;
            const hue = `hsl(var(${hueVar}))`;
            // Shimmer the live states (actioning, awaiting) but not "complete",
            // and only when that state actually has sessions.
            const shimmer = key !== 'complete' && n > 0;
            return (
              <span
                key={key}
                className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur"
              >
                {shimmer && (
                  <span
                    aria-hidden
                    className="pill-shimmer pointer-events-none absolute inset-0"
                    style={{
                      background: `linear-gradient(100deg, transparent 38%, hsl(var(${hueVar}) / 0.42) 50%, transparent 62%)`,
                    }}
                  />
                )}
                <span
                  aria-hidden
                  className="relative h-2 w-2 rounded-full"
                  style={{ background: hue, boxShadow: `0 0 8px ${hue}` }}
                />
                <span className="relative tabular-nums text-foreground">{counts ? n : '–'}</span>
                <span className="relative">{label}</span>
              </span>
            );
          })}
        </div>
      </div>

      <p className="absolute bottom-2 z-10 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/40">
        press any key to wake
      </p>
    </div>
  );
}

function LegendDot({ hueVar, label, value }: { hueVar: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ background: `hsl(var(${hueVar}))` }}
      />
      {label}
      <span className="tabular-nums text-foreground">{value}%</span>
    </span>
  );
}

const CHART_W = 184;
const CHART_H = 52;

function seriesPaths(data: number[]): { line: string; area: string } {
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * CHART_W;
    const y = CHART_H - (v / 100) * CHART_H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${pts.join(' L')}`;
  const area = `${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  return { line, area };
}

function AreaChart({ cpu, ram }: { cpu: number[]; ram: number[] }) {
  const c = seriesPaths(cpu);
  const r = seriesPaths(ram);
  return (
    <svg
      width={CHART_W}
      height={CHART_H}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="overflow-visible"
      aria-hidden
    >
      <path d={r.area} fill="hsl(var(--status-todo) / 0.14)" />
      <path d={c.area} fill="hsl(var(--status-wip) / 0.16)" />
      <path d={r.line} fill="none" stroke="hsl(var(--status-todo))" strokeWidth={1.5} />
      <path d={c.line} fill="none" stroke="hsl(var(--status-wip))" strokeWidth={1.5} />
    </svg>
  );
}

function Ring({
  value,
  hueVar,
  label,
  display,
}: {
  value: number;
  hueVar: string;
  label: string;
  display: string;
}) {
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamp(value, 0, 100) / 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ height: size, width: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border) / 0.7)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`hsl(var(${hueVar}))`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-foreground">
          {display}
        </span>
      </div>
      <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/70">{label}</span>
    </div>
  );
}

// Spinner variants. The sequence always returns to the default "orbit" between
// variants, so the eye keeps re-anchoring on the same shape.
type SpinnerVariant = 'orbit' | 'ellipsis' | 'ring' | 'juggle' | 'bounce' | 'conveyor';
const SPINNER_SEQUENCE: SpinnerVariant[] = [
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
function dotPosition(variant: SpinnerVariant, i: number, tSec: number): DotState {
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
  // ring: fixed radius; orbit: synced breathing radius (never reaches centre).
  const radius = variant === 'ring' ? 20 : 12 + 9 * Math.sin((tSec / 1.5) * Math.PI * 2);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, o: 1 };
}

function easeInOut(k: number): number {
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}

function Spinner() {
  const dotsRef = useRef<Array<HTMLSpanElement | null>>([null, null, null]);

  useEffect(() => {
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
    let prev: SpinnerVariant = 'orbit';
    let target: SpinnerVariant = 'orbit';
    let blendStart = -Infinity; // far in the past → start fully on `target`
    let nextSwitchAt = t0 + DWELL_MS.orbit;

    const frame = (now: number) => {
      const tSec = (now - t0) / 1000;

      if (now >= nextSwitchAt) {
        stepIdx = (stepIdx + 1) % SPINNER_SEQUENCE.length;
        prev = target;
        target = SPINNER_SEQUENCE[stepIdx] ?? 'orbit';
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
  }, []);

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
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}
