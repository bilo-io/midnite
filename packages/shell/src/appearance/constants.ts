import {
  BACKGROUND_PATTERN_DEFAULT,
  BRAND_ACCENT,
  type AccentId,
  type BackgroundPattern,
  type BgIntensity,
  type UiFont,
  type VisualEffects,
} from '@midnite/shared';

// Appearance constants owned by @midnite/shell (Phase 73 Theme B): they back the
// appearance runtime (apply-appearance.ts) that both `web` and `admin` share. The
// appearance *types* + `BRAND_ACCENT` + `BACKGROUND_PATTERN_DEFAULT` remain the
// `@midnite/shared` contract; these are the presentational values (swatch hues,
// font stacks, storage key, defaults). `web/lib/app-settings` re-exports them so
// its many import sites are unchanged — one source of truth.

/** localStorage key for the synced app settings blob (read by the init script). */
export const SETTINGS_STORAGE_KEY = 'midnite.settings';

/**
 * The accent palette swatches. Each is a hue + saturation only — the lightness
 * comes from the active light/dark theme (via the `html[data-accent]` rules in
 * appearance.css), so text-on-accent contrast holds in both themes. `default`
 * applies no override. These swatches are the source for both solid accents and
 * gradient stops (Phase 68).
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
 * Hue offset (degrees) applied either side of a swatch's base hue to render a
 * mono-shade gradient — a subtle "same-family" shift rather than a flat tonal
 * ramp (Phase 68, hue-adjacent decision).
 */
export const MONO_HUE_SHIFT = 14;

/** Selectable background patterns (the settings picker order). */
export const BACKGROUND_PATTERN_OPTIONS: { value: BackgroundPattern; label: string }[] = [
  { value: 'starfield', label: 'Starfield' },
  { value: 'grid', label: 'Grid' },
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
 * Individual visual-effect toggles, each gated via a `data-no-*` attribute on
 * <html> (independent of the motion setting). All on by default.
 */
export const DEFAULT_EFFECTS: VisualEffects = {
  pageReveal: true,
  typewriter: true,
  glass: true,
};

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

/** Opacity band of the animated gradient; default matches the shared contract. */
export const BG_INTENSITY_DEFAULT: BgIntensity = 'balanced';

// Re-exported from the shared contract for the appearance runtime's convenience
// (the init script embeds them); keeps every consumer on one source.
export { BACKGROUND_PATTERN_DEFAULT, BRAND_ACCENT };
