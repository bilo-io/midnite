import { z } from 'zod';

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

/** Accent colour retinting primary/ring/accent (`default` = no override). */
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
  backgroundPattern: BackgroundPatternSchema.default('grid'),
  bgIntensity: BgIntensitySchema.default('balanced'),
  accent: AccentIdSchema.default('default'),
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
   * Which per-route product guides (Phase 66 F) the user has already run, by
   * guide id. Drives the assistant FAB's subtle "unseen guide" dot; the guide
   * itself is always replayable. A loose string list — the canonical guide-id
   * set lives in the web app (`@/lib/guide`), so the gateway stays agnostic
   * (like `features`/`collapsedNavSections`). Absent/empty = nothing seen yet.
   */
  seenGuides: z.array(z.string()).default([]),
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
