/**
 * Client-side settings & profile, persisted to localStorage. The **synced
 * subset** (theme, appearance, nav, timers, feature toggles) is defined once in
 * `@midnite/shared` as `UserPreferences` (Phase 43) — the contract the gateway
 * stores and syncs per user — and re-exported here so the rest of the web app
 * keeps importing these types from `@/lib/app-settings`. `AppSettings` is that
 * synced shape **minus `theme`** (which keeps its own `localStorage` store via the
 * `@midnite/ui` theme-context) plus the device-only/operational settings that
 * never sync (agent-pool size, screensaver passcode, the notification toggle).
 */

import {
  BRAND_ACCENT,
  DEFAULT_USER_PREFERENCES,
  SECONDARY_ACCENT_OFF,
  type AccentId,
  type AccentValue,
  type BackgroundPattern,
  type BgIntensity,
  type Density,
  type GradientType,
  type Motion,
  type NavMode,
  type OfficeView,
  type ShimmerDirection,
  type UiFont,
  type UserPreferences,
  type VisualEffects,
} from '@midnite/shared';

import { DEFAULT_FEATURE_FLAGS, type FeatureKey } from './features';

// Re-export the synced-field types so existing `@/lib/app-settings` import sites
// keep working unchanged — `@midnite/shared` is now their source of truth.
export type {
  AccentId,
  AccentValue,
  BackgroundPattern,
  BgIntensity,
  Density,
  GradientType,
  Motion,
  NavMode,
  OfficeView,
  ShimmerDirection,
  UiFont,
  VisualEffects,
};

export { BRAND_ACCENT, SECONDARY_ACCENT_OFF };

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
/** Side-nav widths, shared by the nav component and the `--nav-offset` CSS var. */
export const NAV_W_COLLAPSED = '3.5rem';
export const NAV_W_EXPANDED = '16rem';

/**
 * The decorative backdrop drawn behind the home screen, screensaver and the
 * dashboard header. Each maps to a self-contained utility class in globals.css.
 */
export const BACKGROUND_PATTERN_DEFAULT: BackgroundPattern = 'dots';

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
 * The accent palette swatches. Each is a hue + saturation only — the lightness
 * comes from the active light/dark theme (via the `html[data-accent]` rules in
 * globals.css), so text-on-accent contrast holds in both themes. `default` applies
 * no override, reproducing today's near-monochrome primary. These swatches are the
 * source for both solid accents and gradient stops (Phase 68).
 */
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

/** Hue+saturation for a swatch id (single source of truth for appliers/presets). */
export const ACCENT_SWATCH_HS: Record<AccentId, { h: number; s: number }> = Object.fromEntries(
  ACCENT_OPTIONS.map((o) => [o.id, { h: o.h, s: o.s }]),
) as Record<AccentId, { h: number; s: number }>;

/**
 * The default primary accent (Phase 68): the brand rainbow gradient. Re-exported
 * from the shared contract so web and the wire agree. Existing users keep their
 * saved solid (coerced from the legacy string); only fresh installs get brand.
 */
export const ACCENT_DEFAULT: AccentValue = BRAND_ACCENT;

/** The solid swatches offered in the picker (the Phase 39 palette). */
export const ACCENT_SOLID_OPTIONS: { value: AccentValue; label: string; swatch: AccentId }[] =
  ACCENT_OPTIONS.map((o) => ({ value: { kind: 'solid', swatch: o.id }, label: o.label, swatch: o.id }));

/**
 * Curated gradient presets (Phase 68 D), brand first. `brand` renders the
 * signature `--node-*` conic rainbow (special-cased in the applier/CSS); the rest
 * are contrast-checked multi-colour gradients built from palette swatches. A
 * single palette swatch rendered as a gradient is a *mono-shade* (hue-adjacent
 * tonal sweep) — offered per-swatch in the builder, not enumerated here.
 */
export const ACCENT_GRADIENT_PRESETS: { id: string; label: string; value: AccentValue }[] = [
  { id: 'brand', label: 'Brand', value: BRAND_ACCENT },
  {
    id: 'aurora',
    label: 'Aurora',
    value: { kind: 'gradient', preset: 'aurora', type: 'linear', stops: ['emerald', 'cyan', 'violet'], angle: 120, animate: false },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    value: { kind: 'gradient', preset: 'sunset', type: 'linear', stops: ['amber', 'orange', 'rose'], angle: 90, animate: false },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    value: { kind: 'gradient', preset: 'ocean', type: 'linear', stops: ['cyan', 'blue'], angle: 135, animate: false },
  },
  {
    id: 'dusk',
    label: 'Dusk',
    value: { kind: 'gradient', preset: 'dusk', type: 'linear', stops: ['blue', 'violet', 'rose'], angle: 135, animate: false },
  },
  {
    id: 'grape',
    label: 'Grape',
    value: { kind: 'gradient', preset: 'grape', type: 'linear', stops: ['violet', 'rose'], angle: 90, animate: false },
  },
  {
    id: 'lagoon',
    label: 'Lagoon',
    value: { kind: 'gradient', preset: 'lagoon', type: 'linear', stops: ['emerald', 'cyan'], angle: 120, animate: false },
  },
  {
    id: 'ember',
    label: 'Ember',
    value: { kind: 'gradient', preset: 'ember', type: 'linear', stops: ['rose', 'orange', 'amber'], angle: 60, animate: false },
  },
  {
    id: 'citrus',
    label: 'Citrus',
    value: { kind: 'gradient', preset: 'citrus', type: 'linear', stops: ['amber', 'emerald'], angle: 90, animate: false },
  },
  {
    id: 'spectrum',
    label: 'Spectrum',
    value: { kind: 'gradient', preset: 'spectrum', type: 'conic', stops: ['blue', 'emerald', 'amber'], angle: 0, animate: false },
  },
];

/** Gradient geometry options for the builder. */
export const GRADIENT_TYPE_OPTIONS: { value: GradientType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'conic', label: 'Conic' },
];

/**
 * Hue offset (degrees) applied either side of a swatch's base hue to render a
 * mono-shade gradient — a subtle "same-family" shift rather than a flat tonal
 * ramp (Phase 68, hue-adjacent decision).
 */
export const MONO_HUE_SHIFT = 14;

/** True when an accent value renders as a gradient. */
export function isGradientAccent(a: AccentValue): a is Extract<AccentValue, { kind: 'gradient' }> {
  return a.kind === 'gradient';
}

/**
 * How much motion the app shows, applied as `data-motion` on <html>:
 * - `system` (default): honour the OS `prefers-reduced-motion` setting.
 * - `reduced`: force animations off regardless of the OS.
 * - `full`: force animations on, overriding an OS reduce preference (opt-in).
 */
export const MOTION_DEFAULT: Motion = 'system';

export const MOTION_OPTIONS: { value: Motion; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Follow the OS reduced-motion setting' },
  { value: 'reduced', label: 'Reduced', hint: 'Minimise animation everywhere' },
  { value: 'full', label: 'Full', hint: 'Always animate, even if the OS says reduce' },
];

/**
 * Individual visual-effect toggles, each gated via a `data-no-*` attribute on
 * <html> (independent of the motion setting). All on by default.
 */
export const DEFAULT_EFFECTS: VisualEffects = {
  pageReveal: true,
  typewriter: true,
  glass: true,
};

export const EFFECT_OPTIONS: { key: keyof VisualEffects; label: string; hint: string }[] = [
  { key: 'pageReveal', label: 'Page reveal', hint: 'Staggered fade-in of page content' },
  { key: 'typewriter', label: 'Typewriter titles', hint: 'Type page titles out character by character' },
  { key: 'glass', label: 'Frosted glass', hint: 'Backdrop blur on overlays and panels' },
];

/**
 * Direction the live status-pill shimmer cascades across the row. `ltr` (default)
 * leads with the left pill and sweeps right; `rtl` leads with the right pill.
 */
export const SHIMMER_DIRECTION_DEFAULT: ShimmerDirection = 'ltr';

export const SHIMMER_DIRECTION_OPTIONS: { value: ShimmerDirection; label: string; hint: string }[] = [
  { value: 'ltr', label: 'Left first', hint: 'Cascade sweeps left → right' },
  { value: 'rtl', label: 'Right first', hint: 'Cascade sweeps right → left' },
];

/**
 * UI density: drives a `data-density` attribute on `<html>` that shrinks the
 * root font-size (from 16px → 14px), causing all rem-based Tailwind utilities
 * to scale proportionally. `comfortable` (default) leaves the root unchanged.
 */
export const DENSITY_DEFAULT: Density = 'comfortable';

export const DENSITY_OPTIONS: { value: Density; label: string; hint: string }[] = [
  { value: 'comfortable', label: 'Comfortable', hint: 'Default spacing and type scale' },
  { value: 'compact', label: 'Compact', hint: 'Tighter spacing — fits more on screen' },
];

/**
 * The interface font applied to body text app-wide via a `--font-ui` CSS custom
 * property on `<html>` (consumed by the body `font-family` in globals.css). Each
 * option is a **system-font stack** — no web fonts are downloaded, so the choice
 * applies instantly with no load-flash. `system` (default) sets no override,
 * leaving the platform default sans stack untouched. Code/terminal (`font-mono`)
 * and the wordmark (`font-brand`) keep their own families via the Tailwind
 * utility cascade, so they're unaffected by this setting.
 */
export const UI_FONT_DEFAULT: UiFont = 'system';

/**
 * Font-family stacks for the non-`system` UI fonts. System fonts only — each
 * family is broadly available on at least one major platform and degrades
 * gracefully to the generic family. `system` is absent here: it clears the var.
 */
export const UI_FONT_STACK: Record<Exclude<UiFont, 'system'>, string> = {
  grotesk: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  humanist: "Optima, Candara, 'Segoe UI', 'Trebuchet MS', sans-serif",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace",
};

export const UI_FONT_OPTIONS: { value: UiFont; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Your platform default sans-serif' },
  { value: 'grotesk', label: 'Grotesk', hint: 'Clean neo-grotesque sans' },
  { value: 'humanist', label: 'Humanist', hint: 'Warmer humanist sans' },
  { value: 'serif', label: 'Serif', hint: 'Classic serif' },
  { value: 'mono', label: 'Mono', hint: 'Monospaced' },
];

/** Opacity of the animated gradient at each intensity level. */
export const BG_INTENSITY_DEFAULT: BgIntensity = 'balanced';

export const BG_INTENSITY_OPTIONS: { value: BgIntensity; label: string }[] = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'bold', label: 'Bold' },
];

/**
 * The full client settings blob persisted under `midnite.settings`. It's the
 * synced `UserPreferences` (Phase 43) **minus `theme`** — which keeps its own
 * `localStorage` store (`midnite.theme`) via the `@midnite/ui` theme-context —
 * plus the **device-local / operational** settings that never sync.
 */
export type AppSettings = Omit<UserPreferences, 'theme' | 'features'> & {
  /** Which optional features (and their nav items) are enabled. */
  features: Record<FeatureKey, boolean>;

  // ── Device-local / operational — never synced (Phase 43) ──────────────────────
  /** Number of agent sessions allowed to run in parallel. */
  agentPoolSize: number;
  /** Require a passcode to wake the screensaver. */
  requirePasscode: boolean;
  /**
   * Only enforce the passcode when the screensaver was opened deliberately via
   * the lock button — the idle screensaver wakes without one.
   */
  passcodeOnlyWhenLocked: boolean;
  /**
   * Desktop notifications when a task needs input (→ waiting) or finishes
   * (→ done). Opt-in: enabling it prompts for the browser's Notification
   * permission. Works in the browser and the Electron desktop app.
   */
  notifyTaskUpdates: boolean;
  /**
   * Autosave interval (seconds) for editors like the Slides deck editor. `0`
   * disables autosave — the Save button is then the only way to persist.
   */
  editorAutosaveSeconds: number;
};

// The synced-field defaults come from the shared contract (single source of
// truth); `theme` is dropped (it lives in the theme-context store) and `features`
// is replaced with the web app's typed default flags.
const { theme: _theme, features: _features, ...SYNCED_DEFAULTS } = DEFAULT_USER_PREFERENCES;

export const DEFAULT_SETTINGS: AppSettings = {
  ...SYNCED_DEFAULTS,
  features: DEFAULT_FEATURE_FLAGS,
  agentPoolSize: AGENT_POOL_DEFAULT,
  requirePasscode: false,
  passcodeOnlyWhenLocked: false,
  notifyTaskUpdates: false,
  editorAutosaveSeconds: 30,
};

export const SETTINGS_STORAGE_KEY = 'midnite.settings';

/** Selectable autosave intervals (seconds) for the editor settings. `0` = off. */
export const EDITOR_AUTOSAVE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: 'Off' },
  { value: 10, label: 'Every 10s' },
  { value: 30, label: 'Every 30s' },
  { value: 60, label: 'Every 60s' },
];

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

// ── Bridge to the synced `UserPreferences` contract (Phase 43) ──────────────────
// The synced blob spans two local stores: `AppSettings` (this module's
// localStorage) and the theme (the `@midnite/ui` theme-context's own key). These
// helpers project between `AppSettings` + theme and the shared `UserPreferences`.

/** Project the local settings + current theme into the synced `UserPreferences`. */
export function appSettingsToPreferences(
  settings: AppSettings,
  theme: UserPreferences['theme'],
): UserPreferences {
  return {
    theme,
    navMode: settings.navMode,
    backgroundPattern: settings.backgroundPattern,
    bgIntensity: settings.bgIntensity,
    bgDynamic: settings.bgDynamic,
    accent: settings.accent,
    accentSecondary: settings.accentSecondary,
    motion: settings.motion,
    density: settings.density,
    uiFont: settings.uiFont,
    effects: settings.effects,
    shimmerDirection: settings.shimmerDirection,
    inactivityTimeoutS: settings.inactivityTimeoutS,
    cycleDurationS: settings.cycleDurationS,
    officeView: settings.officeView,
    features: settings.features,
    collapsedNavSections: settings.collapsedNavSections,
    seenGuides: settings.seenGuides,
    autoShowGuides: settings.autoShowGuides,
  };
}

/** Apply incoming synced preferences onto the local settings store + theme. */
export function applyPreferences(
  prefs: UserPreferences,
  setSettings: (next: AppSettings | ((prev: AppSettings) => AppSettings)) => void,
  setTheme: (theme: UserPreferences['theme']) => void,
): void {
  setSettings((prev) => ({
    ...prev,
    navMode: prefs.navMode,
    backgroundPattern: prefs.backgroundPattern,
    bgIntensity: prefs.bgIntensity,
    bgDynamic: prefs.bgDynamic,
    accent: prefs.accent,
    accentSecondary: prefs.accentSecondary,
    motion: prefs.motion,
    density: prefs.density,
    uiFont: prefs.uiFont,
    effects: prefs.effects,
    shimmerDirection: prefs.shimmerDirection,
    inactivityTimeoutS: prefs.inactivityTimeoutS,
    cycleDurationS: prefs.cycleDurationS,
    officeView: prefs.officeView,
    features: { ...prev.features, ...prefs.features } as AppSettings['features'],
    collapsedNavSections: prefs.collapsedNavSections,
    seenGuides: prefs.seenGuides,
    autoShowGuides: prefs.autoShowGuides,
  }));
  setTheme(prefs.theme);
}
