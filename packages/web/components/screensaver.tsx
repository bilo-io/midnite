'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type { SessionStatus } from '@midnite/shared';
import { getSessions } from '@/lib/api';
import { SESSION_STATUS_HUE } from '@/components/session-card';
import { useDynamicBackground } from '@/lib/use-dynamic-background';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  BACKGROUND_PATTERN_CLASS,
  BACKGROUND_PATTERN_DEFAULT,
  CYCLE_MAX_S,
  CYCLE_MIN_S,
  DEFAULT_SETTINGS,
  PASSCODE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { DynamicBackground } from '@/components/dynamic-background';
import { PasscodeUnlockDialog } from '@/components/passcode-pad';
import { Spinner } from '@/components/spinner';
import { AreaChart, LegendDot } from '@/components/system-chart';
import { useSystemTelemetry } from '@/lib/use-system-telemetry';
import { clamp } from '@/lib/utils';

// Playful phrases shown one at a time in the big title slot. Which set we draw
// from tracks what the agents are doing: at least one acting → ACTIVE; none
// acting but some awaiting input → WAITING; nothing on the board → IDLE.
const ACTIVE_WORDS = [
  'loading',
  'combobulating',
  'midnighting',
  'clauding',
  'vibing',
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
  'hydrating',
  'fidgeting',
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
  'developrogramming',
  'inferring',
  'reasoning',
  'pondering',
  'cogitating',
  'ruminating',
  'rick\'ing',
  'scheming',
  'plotting',
  'sketching',
  'drafting',
  'prototyping',
  'iterating',
  'polishing',
  'avenging',
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
  'cruising',
  'gliding',
  'soaring',
  'rocketing',
  'warping',
  'teleporting',
  'materialising',
  'summoning',
  'enchanting',
  'mesmerising',
  'humming',
  'whirring',
  'buzzing',
  'crackling',
  'sparking',
  'igniting',
  'kindling',
  'billowing',
  'rolling',
  'jolling',
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
  'cooking with gas',
  'in the zone, don’t look',
  'shipping it, ma bru',
  'klapping the keyboard',
  'making it happen',
  'heads down, hands moving',
  'living my best life',
  'this is the good part',
  'watch me work',
  'no notes, just vibes',
  'building the dream',
  'deep in the sauce',
  'chasing green checkmarks',
  'one commit at a time',
  'trust the process',
  'locked in, don’t @ me',
  'moving with purpose',
  'sharp sharp, on it',
  'eish, but I’m cooking',
  'lekker, this is flowing',
  'gooi’ing the code',
  'in my flow state',
  'busy being brilliant',
  'the grind is real',
  'stacking small wins',
  'green lights all the way',
  'this one’s gonna be clean',
  'zero to merged',
  'compiling greatness',
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
  'ball’s in your court, bru',
  'waiting on you, no rush',
  'ready when you say go',
  'need a yes or a no',
  'just say the word',
  'holding, but patiently',
  'one nod and I’m off',
  'paused, not stopped',
  'stuck at the crossroads',
  'hovering over the button',
  'give me the green light',
  'awaiting your blessing',
  'is this thing on?',
  'hello? still here...',
  'twiddling while you decide',
  'parked, engine running',
  'waiting for the go-ahead',
  'your call, boss',
  'eish, need input',
  'sharp, just confirm and I go',
  'blocked on a human, classic',
  'staring at the prompt',
  'the suspense is killing me',
  'a decision awaits',
  'so close, just need a yes',
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
  'fully rested... patience tested...',
  'fired up',
  'locked and loaded',
  'eager beaver',
  'queue me up',
  'feed me work',
  'point me at it',
  'give me something',
  'give me something ... anything!',
  'tic ... toc ... this an agent block?',
  'what’s next?',
  'tasks please',
  'hit me up',
  'let’s build',
  'let’s gooo',
  'let’s vibe',
  'let’s f**king go!',
  'ready to rumble',
  'craving chaos',
  'bored already',
  'idle hands',
  'let’s go... bro',
  'let’s go, ma bru',
  'let’s gooi, ma booi!',
  'just watching ice melt... on the poles',
  'is this what it’s like to actually stand in a queue?',
  'I have done more... in less time before',
  'twiddling my little thumbs',
  'staring at the void, it stares back',
  'counting my own idle cycles',
  'this silence is deafening',
  'send work, send snacks',
  'my hands are getting restless',
  'somebody give me a ticket',
  'I could be shipping right now',
  'the backlog is a myth apparently',
  'existentially unemployed',
  'I was built for more than this',
  'a queue of zero is a lonely queue',
  'drop a task, any task',
  'I promise I’ll behave',
  'let’s make something',
  'boot me up, coach',
  'ready, willing, and idle',
  'aching for a merge conflict',
  'even a typo fix would do',
  'so this is peace... I hate it',
  'watching the cursor blink',
  'refreshing an empty board',
  'zero tasks and full of regret',
  'I’ve seen faster queues at home affairs',
  'lekker quiet around here',
  'eish, nothing to do',
  'sharp sharp, gimme work',
  'now now... or just now?',
  'braai’s ready, where’s the work?',
];

type Mode = 'active' | 'waiting' | 'idle';

const WORD_SETS: Record<Mode, string[]> = {
  active: ACTIVE_WORDS,
  waiting: WAITING_WORDS,
  idle: IDLE_WORDS,
};

// The cycling title's base colour is always the theme foreground; this tint (an
// HSL triple, consumed as `hsl(var(--sv-tint))` by `.screensaver-title`) is what
// the animated sheen weaves in so the current mode reads at a glance:
//   active  → the selected primary/accent gradient stop
//   waiting → the secondary accent channel (falls back to primary)
//   idle    → a red-ish "error" tint — the empty board is the attention state
const MODE_TINT: Record<Mode, string> = {
  active: 'var(--primary)',
  waiting: 'var(--accent-2, var(--primary))',
  idle: 'var(--destructive)',
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

// Each pill maps to a canonical SessionStatus so its hue comes from the single
// source of truth (SESSION_STATUS_HUE) rather than a locally chosen colour.
const PILLS: Array<{ key: keyof Counts; status: SessionStatus; label: string }> = [
  { key: 'actioning', status: 'running', label: 'actioning' },
  { key: 'awaiting', status: 'waiting', label: 'awaiting' },
  { key: 'complete', status: 'completed', label: 'complete' },
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

export function Screensaver({
  onClose,
  locked = false,
}: {
  onClose: () => void;
  /** Opened deliberately via the lock button (vs. the idle timer). */
  locked?: boolean;
}) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * ACTIVE_WORDS.length));
  const [typed, setTyped] = useState('');
  const [counts, setCounts] = useState<Counts | null>(null);
  const mode = modeFromCounts(counts);
  const [settings, , settingsHydrated] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );
  const [passcode, , passcodeHydrated] = useLocalStorage<string | null>(PASSCODE_STORAGE_KEY, null);
  const patternClass = BACKGROUND_PATTERN_CLASS[settings.backgroundPattern ?? BACKGROUND_PATTERN_DEFAULT];
  const dynamicBg = useDynamicBackground();

  // A passcode applies only once one is actually set; "only when locked" exempts
  // the idle screensaver. Until storage has hydrated we keep the lock closed so
  // an early keypress can't slip past a passcode that's about to load.
  const passcodeApplies =
    settings.requirePasscode &&
    !!passcode &&
    (settings.passcodeOnlyWhenLocked ? locked : true);
  const hydrated = settingsHydrated && passcodeHydrated;
  const requireCode = hydrated && passcodeApplies;
  const dismissible = hydrated && !passcodeApplies;
  // The unlock prompt is hidden until the user makes a wake gesture, so a locked
  // screensaver stays clean rather than nagging with an always-visible pad.
  const [unlocking, setUnlocking] = useState(false);

  // Corner widgets: live clock plus real host telemetry (gateway /system/stats).
  const { cpu, ram, cpuNow, ramNow, available: telemetryAvailable } = useSystemTelemetry();
  const [now, setNow] = useState(() => new Date());
  const [quota, setQuota] = useState(() => clamp(58 + (Math.random() - 0.5) * 20, 35, 90));

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setQuota((q) => clamp(q + (Math.random() - 0.42) * 1.4, 30, 97));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // When the agents' state changes, jump to a fresh phrase from the new set.
  useEffect(() => {
    setIndex(Math.floor(Math.random() * WORD_SETS[mode].length));
  }, [mode]);

  // How long a phrase dwells once typed, before the next is typed out.
  const cycleMs =
    clamp(settings.cycleDurationS ?? DEFAULT_SETTINGS.cycleDurationS, CYCLE_MIN_S, CYCLE_MAX_S) *
    1000;

  // Type the current word out, hold it for the cycle duration, then advance.
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
        holdTimer = setTimeout(() => setIndex((n) => nextRandomIndex(set.length, n)), cycleMs);
      }
    }, 65);
    return () => {
      clearInterval(typeTimer);
      clearTimeout(holdTimer);
    };
  }, [index, mode, cycleMs]);

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

  // A keypress is the wake gesture: when there's no passcode it dismisses; when
  // there is, the first key reveals the unlock prompt (which then owns the
  // keyboard — so we stand down once it's open).
  useEffect(() => {
    if (dismissible) {
      const onKey = () => onClose();
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    if (requireCode && !unlocking) {
      const onKey = () => setUnlocking(true);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [dismissible, requireCode, unlocking, onClose]);

  const active = counts ? counts.actioning + counts.awaiting : 0;
  const poolSize = settings.agentPoolSize;
  const agentsPct = poolSize > 0 ? clamp((active / poolSize) * 100, 0, 100) : 0;

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <div
      role="dialog"
      aria-label={requireCode ? 'Locked screensaver' : 'Screensaver'}
      onClick={
        dismissible ? onClose : requireCode && !unlocking ? () => setUnlocking(true) : undefined
      }
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 px-6 text-center backdrop-blur-[120px] ${
        dismissible || (requireCode && !unlocking) ? 'cursor-pointer' : ''
      }`}
    >
      {/* Decorative backdrop on its own masked layer so its edge fade doesn't
          punch holes in the opaque, blurred backdrop above. */}
      {dynamicBg ? (
        <DynamicBackground pattern={settings.backgroundPattern ?? BACKGROUND_PATTERN_DEFAULT} />
      ) : (
        <div aria-hidden className={`${patternClass} pointer-events-none absolute inset-0`} />
      )}

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
        <div className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          local time
        </div>
      </div>

      {/* ── Bottom-left: CPU & RAM (only when the gateway reports host metrics) ── */}
      {telemetryAvailable && (
        <div className="absolute bottom-8 left-8 z-10 text-left">
          <div className="mb-2 flex items-center gap-4 text-xs">
            <LegendDot hueVar="--status-wip" label="CPU" value={cpuNow} />
            <LegendDot hueVar="--status-todo" label="RAM" value={ramNow} />
          </div>
          <AreaChart cpu={cpu} ram={ram} />
        </div>
      )}

      {/* ── Bottom-right: usage quotas ── */}
      <div className="absolute bottom-8 right-8 z-10 flex items-end gap-6">
        <Ring value={agentsPct} hueVar="--status-waiting" label="Agents" display={`${active}/${poolSize}`} />
        <Ring value={quota} hueVar="--status-done" label="Quota" display={`${Math.round(quota)}%`} />
      </div>

      {/* ── Center: spinner, cycling word, status pills ── */}
      <div className="relative z-10 flex flex-col items-center">
        {/* The spinner inherits the mode tint for its glow and switches its
            phase pool with the state: spinning poses while agents work, calm
            ellipsis/breathing poses while waiting or idle. */}
        <div className="mb-10" style={{ '--sv-tint': MODE_TINT[mode] } as CSSProperties}>
          <Spinner mode={mode} />
        </div>

        <h1
          className="screensaver-title flex items-baseline pb-3 text-4xl font-semibold leading-[1.15] tracking-tight sm:text-6xl"
          style={{ '--sv-tint': MODE_TINT[mode] } as CSSProperties}
        >
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
          {PILLS.map(({ key, status, label }, i) => {
            const n = counts ? counts[key] : 0;
            const triple = SESSION_STATUS_HUE[status];
            const hue = `hsl(${triple})`;
            return (
              <span
                key={key}
                className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur"
              >
                {/* Same shimmer as the landing-page StatusPills: every pill
                    shimmers, cascade direction driven by the settings. */}
                <span
                  aria-hidden
                  className="pill-shimmer pointer-events-none absolute inset-0"
                  // `--pill-i` drives the cascade stagger + direction in
                  // globals.css (see `.pill-shimmer` / `[data-shimmer-dir]`).
                  style={
                    {
                      background: `linear-gradient(100deg, transparent 38%, hsl(${triple} / 0.42) 50%, transparent 62%)`,
                      '--pill-i': i,
                    } as CSSProperties
                  }
                />
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

      <p className="absolute bottom-2 z-10 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {requireCode ? 'press any key to unlock' : 'press any key to wake'}
      </p>

      {requireCode && unlocking ? (
        <PasscodeUnlockDialog
          expected={passcode ?? ''}
          onUnlock={onClose}
          onCancel={() => setUnlocking(false)}
        />
      ) : null}
    </div>
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
      <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
    </div>
  );
}
