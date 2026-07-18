import { z } from 'zod';

import { UpdateChannelSchema } from './update.js';

/**
 * Server-syncable user preferences (Phase 43).
 *
 * This is the **contract** for the subset of a user's UI preferences that sync
 * across devices when signed in — the personal look-and-feel: theme, the Phase 39
 * appearance set (background, accent, density, motion, font, effects), nav mode,
 * the screensaver/cycle timers, and feature toggles. Device-local or operational
 * settings (agent-pool size, screensaver passcode, the desktop-notification
 * toggle) are deliberately **not** part of this contract — they stay in the web
 * app's `AppSettings` only.
 *
 * Every field is defaulted, so a partial or empty blob still parses to a complete
 * object (forward-compatible); unknown keys are stripped rather than rejected, so
 * an older gateway can store a newer client's blob without error.
 */

// ── Field value enums (mirror the web `AppSettings` literal unions) ──────────────

/** Light/dark theme choice (`time` = light by day, dark by night; `system` = OS). */
export const ThemeSchema = z.enum(['light', 'dark', 'system', 'time']);
export type Theme = z.infer<typeof ThemeSchema>;

/** Collapse/expand/lock behaviour of the side navigation. */
export const NavModeSchema = z.enum(['auto', 'expanded', 'collapsed']);
export type NavMode = z.infer<typeof NavModeSchema>;

/** Decorative backdrop pattern (home screen, screensaver, dashboard header). */
export const BackgroundPatternSchema = z.enum([
  'grid',
  'honeycomb',
  'gradient',
  'dots',
  'diagonal-lines',
  'topographic',
  'aurora',
  'plus-cross',
  'waves',
  'grain',
  'blueprint',
  'mesh-gradient',
]);
export type BackgroundPattern = z.infer<typeof BackgroundPatternSchema>;

/** Visibility level of the animated-gradient backdrop. */
export const BgIntensitySchema = z.enum(['subtle', 'balanced', 'bold']);
export type BgIntensity = z.infer<typeof BgIntensitySchema>;

/** A single accent palette swatch — a hue+saturation slot (`default` = no override). */
export const AccentIdSchema = z.enum([
  'default',
  'blue',
  'violet',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'orange',
]);
export type AccentId = z.infer<typeof AccentIdSchema>;

/**
 * Geometry of a gradient accent (Phase 68). `linear` sweeps along `angle`;
 * `conic` sweeps around the centre starting at `angle`.
 */
export const GradientTypeSchema = z.enum(['linear', 'conic']);
export type GradientType = z.infer<typeof GradientTypeSchema>;

/**
 * The accent value (Phase 68). Either a **solid** swatch (the Phase 39 model) or a
 * **gradient** built from 1–3 palette swatches (`stops.length === 1` renders as a
 * mono-shade — a hue-adjacent tonal sweep of that one swatch). `preset` is a UI /
 * special-render tag: `'brand'` renders the signature `--node-*` conic rainbow,
 * `'custom'` is a user-built gradient, other ids mark a curated preset.
 *
 * **Backward-compatible:** a legacy bare-string `accent` (e.g. `"violet"`,
 * `"default"`) is coerced to `{ kind: 'solid', swatch }` on read, so pre-Phase-68
 * synced/stored blobs hydrate cleanly.
 */
export const AccentValueSchema = z.preprocess(
  (v) => (typeof v === 'string' ? { kind: 'solid', swatch: v } : v),
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('solid'),
      swatch: AccentIdSchema.default('default'),
    }),
    z.object({
      kind: z.literal('gradient'),
      preset: z.string().default('custom'),
      type: GradientTypeSchema.default('linear'),
      stops: z.array(AccentIdSchema).min(1).max(3).default(['blue', 'violet']),
      angle: z.number().min(0).max(360).default(90),
      animate: z.boolean().default(false),
    }),
  ]),
);
export type AccentValue = z.infer<typeof AccentValueSchema>;

/**
 * The default accent: the signature brand rainbow (the `--node-*` conic sweep,
 * promoted from the animated-gradient background). New installs get this; existing
 * users keep whatever solid swatch they saved (coerced from the legacy string).
 */
export const BRAND_ACCENT: AccentValue = {
  kind: 'gradient',
  preset: 'brand',
  type: 'conic',
  stops: ['cyan', 'violet', 'amber'],
  angle: 0,
  animate: false,
};

/** The secondary accent starts off (a `default` solid = no `--accent-2` override). */
export const SECONDARY_ACCENT_OFF: AccentValue = { kind: 'solid', swatch: 'default' };

/** How much motion the app shows (honour OS / force off / force on). */
export const MotionSchema = z.enum(['system', 'reduced', 'full']);
export type Motion = z.infer<typeof MotionSchema>;

/** UI density — `comfortable` (default) or `compact`. */
export const DensitySchema = z.enum(['comfortable', 'compact']);
export type Density = z.infer<typeof DensitySchema>;

/** Interface font for body text (`system` default; others are system-font stacks). */
export const UiFontSchema = z.enum(['system', 'grotesk', 'humanist', 'serif', 'mono']);

/** Which office rendering engine opens by default (Phase 63 F). */
export const OfficeViewSchema = z.enum(['2d', '3d']);
export type OfficeView = z.infer<typeof OfficeViewSchema>;
export type UiFont = z.infer<typeof UiFontSchema>;

/** Per-effect visual toggles (page reveal, typewriter, frosted glass). All on by default. */
export const VisualEffectsSchema = z.object({
  pageReveal: z.boolean().default(true),
  typewriter: z.boolean().default(true),
  glass: z.boolean().default(true),
});
export type VisualEffects = z.infer<typeof VisualEffectsSchema>;

/**
 * Direction the status-pill shimmer cascades across the row: `ltr` (default) leads
 * with the left pill and sweeps rightward; `rtl` leads with the right pill.
 */
export const ShimmerDirectionSchema = z.enum(['ltr', 'rtl']);
export type ShimmerDirection = z.infer<typeof ShimmerDirectionSchema>;

// ── The synced preferences object ───────────────────────────────────────────────

export const UserPreferencesSchema = z.object({
  theme: ThemeSchema.default('system'),
  navMode: NavModeSchema.default('auto'),
  /** The nebula dots are the signature backdrop — the default for fresh installs. */
  backgroundPattern: BackgroundPatternSchema.default('dots'),
  bgIntensity: BgIntensitySchema.default('balanced'),
  /**
   * Dynamic motion for the background pattern: when on, the backdrop is drawn on
   * a canvas with a subtle idle animation and reacts to the cursor (repulsed
   * dots, swelling honeycomb cells, tracking rulers, drifting gradient clouds).
   * On by default (the dots nebula is the flagship look); always falls back to
   * the static pattern under reduced motion.
   */
  bgDynamic: z.boolean().default(true),
  /**
   * The primary accent (Phase 68): a solid swatch or a gradient. Defaults to the
   * brand rainbow. A legacy bare-string value is coerced to a solid (see
   * `AccentValueSchema`), so pre-Phase-68 blobs keep their chosen colour.
   */
  accent: AccentValueSchema.default(() => BRAND_ACCENT),
  /**
   * An independent secondary accent channel (Phase 68) — a first-class token used
   * both as a gradient stop source and for standalone secondary UI accents. Off by
   * default (a `default` solid), so existing users see no change.
   */
  accentSecondary: AccentValueSchema.default(() => SECONDARY_ACCENT_OFF),
  motion: MotionSchema.default('system'),
  density: DensitySchema.default('comfortable'),
  uiFont: UiFontSchema.default('system'),
  effects: VisualEffectsSchema.default(() => VisualEffectsSchema.parse({})),
  /**
   * Which way the live status-pill shimmer cascades. `ltr` (default) leads with
   * the left pill; `rtl` leads with the right. Additive — existing blobs default
   * to `ltr`.
   */
  shimmerDirection: ShimmerDirectionSchema.default('ltr'),
  /** Seconds of inactivity before the screensaver opens. */
  inactivityTimeoutS: z.number().int().positive().default(30),
  /** Seconds a cycling phrase is shown before the next is typed. */
  cycleDurationS: z.number().int().positive().default(5),
  /**
   * Which office rendering engine to open by default (Phase 63 F). `2d` is the
   * long-standing Phaser floor; `3d` is the first-person three.js office. A
   * `?view=` URL param overrides this per visit. Additive — existing prefs blobs
   * default to `2d`.
   */
  officeView: OfficeViewSchema.default('2d'),
  /**
   * Which app-update channel this user follows (Phase 71 Theme H). `stable`
   * (default) tracks tagged releases; `beta` opts into pre-release builds — the
   * web poll fetches the channel's manifest (`version.json` vs `version.beta.json`)
   * and the desktop updater sets `autoUpdater.channel` to match. Additive —
   * existing blobs default to `stable`.
   */
  updateChannel: UpdateChannelSchema.default('stable'),
  /**
   * Which optional features (and their nav items) are enabled. A generic
   * `key → enabled` map — the canonical feature-key set lives in the web app
   * (`@/lib/features`); the contract stays loose so the gateway never needs it.
   */
  features: z.record(z.string(), z.boolean()).default({}),
  /**
   * Which side-nav category sections the user has collapsed. A loose list of
   * category keys (`app`/`agents`/`insights`) — like `features`, the canonical
   * key set lives in the web app (`@/lib/features`), so the gateway stays
   * agnostic. Absent/empty = every section expanded.
   */
  collapsedNavSections: z.array(z.string()).default([]),
  /**
   * Which per-route product guides the user has already run, as a
   * `guide id → version seen` map (Phase 67 A — was a flat `string[]` in Phase
   * 66 F). Storing the version lets an edited guide re-surface: the web app
   * treats a guide as seen only when the stored version is `>=` the guide's
   * current `version`. Drives the assistant FAB's subtle "unseen guide" dot; the
   * guide itself is always replayable. Loose by design — the canonical guide-id
   * set + versions live in the web app (`@/lib/guide`), so the gateway stays
   * agnostic (like `features`/`collapsedNavSections`).
   *
   * **Persisted-union read-coercion:** a legacy `string[]` blob (`['board']`)
   * coerces on read to `{ board: 1 }` so pre-Phase-67 rows hydrate cleanly.
   * Absent/empty = nothing seen yet.
   */
  seenGuides: z
    .union([z.array(z.string()), z.record(z.string(), z.number())])
    .default({})
    .transform((value): Record<string, number> =>
      Array.isArray(value) ? Object.fromEntries(value.map((id) => [id, 1])) : value,
    ),
  /**
   * Whether unseen product guides auto-launch once when the user first lands on
   * their route (Phase 67 A). `true` by default; turning it off keeps guides
   * fully replayable from the assistant menu but stops the one-time auto-launch.
   * Additive — existing blobs default to `true`.
   */
  autoShowGuides: z.boolean().default(true),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/** A complete defaults object, derived from the schema (single source of truth). */
export const DEFAULT_USER_PREFERENCES: UserPreferences = UserPreferencesSchema.parse({});

// ── Wire contracts for `GET` / `PUT /users/me/preferences` (Phase 43 Theme B) ────

/** `PUT /users/me/preferences` body — the full preferences object (full-object replace). */
export const PutPreferencesRequestSchema = UserPreferencesSchema;
export type PutPreferencesRequest = z.infer<typeof PutPreferencesRequestSchema>;

/** Response for both `GET` and `PUT` — the stored prefs + when they last changed. */
export const PreferencesResponseSchema = z.object({
  preferences: UserPreferencesSchema,
  /** ISO timestamp of the last write, or `null` if the user has never saved. */
  updatedAt: z.string().nullable(),
});
export type PreferencesResponse = z.infer<typeof PreferencesResponseSchema>;
