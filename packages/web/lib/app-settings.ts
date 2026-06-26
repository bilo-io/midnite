/**
 * Client-side settings & profile, persisted to localStorage for now. These will
 * eventually be backed by the gateway config (`midnite.json`) and a user record,
 * but the shapes here are the source of truth the UI reads from.
 */

import { DEFAULT_FEATURE_FLAGS, type FeatureKey } from './features';

export const AGENT_POOL_MIN = 1;
export const AGENT_POOL_DEFAULT = 4;
export const AGENT_POOL_MAX = 16;

// Inactivity before the screensaver kicks in, in seconds.
export const INACTIVITY_MIN_S = 10;
export const INACTIVITY_DEFAULT_S = 30;
export const INACTIVITY_MAX_S = 14400; // 4 hours

/**
 * Snap points for the inactivity slider, ascending — quick locks through to
 * multi-hour waits. The slider steps across these by index rather than scrubbing
 * a continuous range, which would be unusable across a 10s–4h span.
 */
export const INACTIVITY_PRESETS_S = [
  10, 15, 20, 30, 45, 60, 120, 180, 300, 600, 900, 1200, 1800, 2700, 3600, 7200, 10800, 14400,
] as const;

/** Index of the preset nearest to `seconds` (handles legacy non-preset values). */
export function nearestInactivityPresetIndex(seconds: number): number {
  let best = 0;
  for (let i = 1; i < INACTIVITY_PRESETS_S.length; i++) {
    if (Math.abs(INACTIVITY_PRESETS_S[i]! - seconds) < Math.abs(INACTIVITY_PRESETS_S[best]! - seconds)) {
      best = i;
    }
  }
  return best;
}

/**
 * How long a cycling phrase is shown before the next one is typed out — used by
 * both the screensaver and the home screen, in seconds.
 */
export const CYCLE_MIN_S = 2;
export const CYCLE_DEFAULT_S = 5;
export const CYCLE_MAX_S = 10;

// Primary-agent heartbeat cadence, in hours: the orchestrator's heartbeat
// prompt runs on this interval. Once an hour at the most frequent, roughly once
// a month at the least.
export const HEARTBEAT_MIN_H = 1;
export const HEARTBEAT_DEFAULT_H = 4;
export const HEARTBEAT_MAX_H = 720; // ~30 days

/** Selectable cadences shown in the settings dropdown, in ascending order. */
export const HEARTBEAT_PRESETS: { hours: number; label: string }[] = [
  { hours: 1, label: 'Every hour' },
  { hours: 4, label: 'Every 4 hours' },
  { hours: 8, label: 'Every 8 hours' },
  { hours: 12, label: 'Every 12 hours' },
  { hours: 24, label: 'Once a day' },
  { hours: 168, label: 'Once a week' },
  { hours: 720, label: 'Once a month' },
];

/** Human label for a heartbeat cadence, falling back to a terse "Every Nh/Nd". */
export function formatHeartbeatInterval(hours: number): string {
  const preset = HEARTBEAT_PRESETS.find((p) => p.hours === hours);
  if (preset) return preset.label;
  if (hours < 24) return `Every ${hours}h`;
  return `Every ${Math.round(hours / 24)}d`;
}

/**
 * How the side navigation behaves:
 * - `auto`: collapsed icon bar at rest, overlay-expands on hover/focus (default).
 * - `expanded`: locked open with labels; page content shifts to make room.
 * - `collapsed`: locked as the icon bar, no hover-expand.
 */
export type NavMode = 'auto' | 'expanded' | 'collapsed';

/** Side-nav widths, shared by the nav component and the `--nav-offset` CSS var. */
export const NAV_W_COLLAPSED = '3.5rem';
export const NAV_W_EXPANDED = '14rem';

/**
 * The decorative backdrop drawn behind the home screen, screensaver and the
 * dashboard header. Each maps to a self-contained utility class in globals.css.
 */
export type BackgroundPattern =
  | 'grid'
  | 'honeycomb'
  | 'gradient'
  | 'dots'
  | 'diagonal-lines'
  | 'topographic'
  | 'aurora'
  | 'plus-cross'
  | 'waves'
  | 'grain'
  | 'blueprint'
  | 'mesh-gradient';

export const BACKGROUND_PATTERN_DEFAULT: BackgroundPattern = 'grid';

/** Pattern → CSS utility class drawn at each background site. */
export const BACKGROUND_PATTERN_CLASS: Record<BackgroundPattern, string> = {
  grid: 'bg-grid',
  honeycomb: 'bg-honeycomb',
  gradient: 'bg-animated-gradient',
  dots: 'bg-dots',
  'diagonal-lines': 'bg-diagonal-lines',
  topographic: 'bg-topographic',
  aurora: 'bg-aurora',
  'plus-cross': 'bg-plus-cross',
  waves: 'bg-waves',
  grain: 'bg-grain',
  blueprint: 'bg-blueprint',
  'mesh-gradient': 'bg-mesh-gradient',
};

export const BACKGROUND_PATTERN_OPTIONS: { value: BackgroundPattern; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'honeycomb', label: 'Honeycomb' },
  { value: 'dots', label: 'Dots' },
  { value: 'diagonal-lines', label: 'Diagonal' },
  { value: 'plus-cross', label: 'Plus' },
  { value: 'topographic', label: 'Topographic' },
  { value: 'waves', label: 'Waves' },
  { value: 'blueprint', label: 'Blueprint' },
  { value: 'grain', label: 'Grain' },
  { value: 'aurora', label: 'Aurora' },
  { value: 'mesh-gradient', label: 'Mesh' },
  { value: 'gradient', label: 'Gradient' },
];

/**
 * The accent colour that retints the primary/ring/accent design tokens at
 * runtime. Each swatch is a hue + saturation only — the lightness comes from the
 * active light/dark theme (via the `html[data-accent]` rules in globals.css), so
 * text-on-accent contrast holds in both themes. `default` applies no override,
 * reproducing today's near-monochrome primary.
 */
export type AccentId =
  | 'default'
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'orange';

export const ACCENT_DEFAULT: AccentId = 'default';

export const ACCENT_OPTIONS: { id: AccentId; label: string; h: number; s: number }[] = [
  { id: 'default', label: 'Default', h: 240, s: 6 },
  { id: 'blue', label: 'Blue', h: 217, s: 80 },
  { id: 'violet', label: 'Violet', h: 263, s: 70 },
  { id: 'emerald', label: 'Emerald', h: 152, s: 58 },
  { id: 'amber', label: 'Amber', h: 38, s: 85 },
  { id: 'rose', label: 'Rose', h: 347, s: 75 },
  { id: 'cyan', label: 'Cyan', h: 190, s: 72 },
  { id: 'orange', label: 'Orange', h: 24, s: 85 },
];

/** Opacity of the animated gradient at each intensity level. */
export type BgIntensity = 'subtle' | 'balanced' | 'bold';
export const BG_INTENSITY_DEFAULT: BgIntensity = 'balanced';

export const BG_INTENSITY_OPTIONS: { value: BgIntensity; label: string }[] = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'bold', label: 'Bold' },
];

export type AppSettings = {
  /** Number of agent sessions allowed to run in parallel. */
  agentPoolSize: number;
  /** Seconds of inactivity before the screensaver opens. */
  inactivityTimeoutS: number;
  /** Seconds a cycling phrase is shown before the next is typed (screensaver + home). */
  cycleDurationS: number;
  /** Require a passcode to wake the screensaver. */
  requirePasscode: boolean;
  /**
   * Only enforce the passcode when the screensaver was opened deliberately via
   * the lock button — the idle screensaver wakes without one.
   */
  passcodeOnlyWhenLocked: boolean;
  /** Collapse/expand/lock behaviour of the side navigation. */
  navMode: NavMode;
  /** Decorative backdrop pattern (home screen, screensaver, dashboard header). */
  backgroundPattern: BackgroundPattern;
  /** Visibility level of the animated-gradient backdrop (only shown when gradient is active). */
  bgIntensity: BgIntensity;
  /** Accent colour retinting primary/ring/accent across the app (`default` = no override). */
  accent: AccentId;
  /**
   * Desktop notifications when a task needs input (→ waiting) or finishes
   * (→ done). Opt-in: enabling it prompts for the browser's Notification
   * permission. Works in the browser and the Electron desktop app.
   */
  notifyTaskUpdates: boolean;
  /** Which optional features (and their nav items) are enabled. */
  features: Record<FeatureKey, boolean>;
};

export const DEFAULT_SETTINGS: AppSettings = {
  agentPoolSize: AGENT_POOL_DEFAULT,
  inactivityTimeoutS: INACTIVITY_DEFAULT_S,
  cycleDurationS: CYCLE_DEFAULT_S,
  requirePasscode: false,
  passcodeOnlyWhenLocked: false,
  navMode: 'auto',
  backgroundPattern: BACKGROUND_PATTERN_DEFAULT,
  bgIntensity: BG_INTENSITY_DEFAULT,
  accent: ACCENT_DEFAULT,
  notifyTaskUpdates: false,
  features: DEFAULT_FEATURE_FLAGS,
};

export const SETTINGS_STORAGE_KEY = 'midnite.settings';

/** Length of the screensaver passcode, in digits. */
export const PASSCODE_LENGTH = 4;

/**
 * Where the screensaver passcode is kept. Stored in plain localStorage so a
 * forgotten passcode can simply be cleared — this is a convenience lock, not a
 * security boundary.
 */
export const PASSCODE_STORAGE_KEY = 'midnite.passcode';

export type Profile = {
  /** Free-form "about me" the user writes about themselves. */
  about: string;
  /** Guidance injected into every session, on top of project-level guidelines. */
  guidelines: string;
};

export const DEFAULT_PROFILE: Profile = {
  about: '',
  guidelines: '',
};

export const PROFILE_STORAGE_KEY = 'midnite.profile';
