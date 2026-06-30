import {
  ACCENT_OPTIONS,
  BACKGROUND_PATTERN_DEFAULT,
  BG_INTENSITY_DEFAULT,
  DEFAULT_EFFECTS,
  SETTINGS_STORAGE_KEY,
  UI_FONT_STACK,
  type AccentId,
  type BackgroundPattern,
  type BgIntensity,
  type Density,
  type Motion,
  type UiFont,
  type VisualEffects,
} from './app-settings';

/**
 * Apply an accent colour by setting `--accent-h` / `--accent-s` (bare numbers) and
 * the `data-accent` attribute on <html>; the theme-aware lightness lives in the
 * `html[data-accent]` rules in globals.css. The `default` accent clears the
 * override so the design-token primary is used unchanged.
 */
export function applyAccent(accent: AccentId): void {
  const html = document.documentElement;
  const opt = ACCENT_OPTIONS.find((a) => a.id === accent);
  if (!opt || opt.id === 'default') {
    html.removeAttribute('data-accent');
    html.style.removeProperty('--accent-h');
    html.style.removeProperty('--accent-s');
    return;
  }
  html.style.setProperty('--accent-h', String(opt.h));
  html.style.setProperty('--accent-s', String(opt.s));
  html.setAttribute('data-accent', opt.id);
}

/**
 * Apply the motion preference as `data-motion` on <html>. `reduced` forces
 * animations off (universal kill rule in globals.css); `full` re-enables them
 * even when the OS prefers reduced; `system` defers to the OS media query.
 */
export function applyMotion(motion: Motion): void {
  document.documentElement.setAttribute('data-motion', motion);
}

/**
 * Apply the density preference as `data-density` on <html>. `compact` reduces
 * the root font-size to 14px (via the globals.css rule), shrinking all
 * rem-based Tailwind utilities proportionally. `comfortable` clears the
 * attribute so the default 16px root size applies.
 */
export function applyDensity(density: Density): void {
  const html = document.documentElement;
  if (density === 'compact') {
    html.setAttribute('data-density', 'compact');
  } else {
    html.removeAttribute('data-density');
  }
}

/**
 * Apply the background pattern as `data-bg` on <html>. Any element with
 * `data-bg-target` picks up the pattern via the `html[data-bg='x'] [data-bg-target]`
 * CSS rules in globals.css — applied pre-paint so a reload never flashes the
 * default grid. Also sets `data-bg-intensity` when the animated gradient is active.
 * The default pattern clears both attributes.
 */
export function applyBackground(pattern: BackgroundPattern, intensity: BgIntensity): void {
  const html = document.documentElement;
  html.setAttribute('data-bg', pattern ?? BACKGROUND_PATTERN_DEFAULT);
  if (pattern === 'gradient') {
    html.setAttribute('data-bg-intensity', intensity ?? BG_INTENSITY_DEFAULT);
  } else {
    html.removeAttribute('data-bg-intensity');
  }
}

/**
 * Apply the interface font by setting the `--font-ui` CSS custom property (the
 * body `font-family` in globals.css falls through to the platform stack when it's
 * unset) and a `data-ui-font` attribute on <html>. `system` clears both, so the
 * default platform sans stack applies — reproducing today's look exactly. Stacks
 * are system fonts only, so the change is instant with no download/flash.
 */
export function applyUiFont(font: UiFont): void {
  const html = document.documentElement;
  const stack = UI_FONT_STACK[font as Exclude<UiFont, 'system'>];
  if (!stack) {
    html.style.removeProperty('--font-ui');
    html.removeAttribute('data-ui-font');
    return;
  }
  html.style.setProperty('--font-ui', stack);
  html.setAttribute('data-ui-font', font);
}

/**
 * Apply the per-effect toggles as `data-no-*` attributes on <html> (set only
 * when an effect is *disabled*). globals.css gates each effect on its attribute.
 */
export function applyEffects(effects: VisualEffects): void {
  const html = document.documentElement;
  const e = { ...DEFAULT_EFFECTS, ...effects };
  html.toggleAttribute('data-no-page-reveal', !e.pageReveal);
  html.toggleAttribute('data-no-typewriter', !e.typewriter);
  html.toggleAttribute('data-no-glass', !e.glass);
}

// hue/sat lookup for the non-default accents, embedded into the pre-paint script
// below so it stays in sync with ACCENT_OPTIONS (single source of truth).
const ACCENT_MAP = Object.fromEntries(
  ACCENT_OPTIONS.filter((a) => a.id !== 'default').map((a) => [a.id, [a.h, a.s]]),
);

/**
 * Inline, render-blocking script for the document <head>: applies the saved
 * accent, motion, density, effect, AND background prefs BEFORE first paint so a
 * reload never flashes the default look. Web's companion to `@midnite/ui`'s
 * theme init script (kept separate so the ui leaf stays ignorant of web's
 * settings shape). Inject via a raw <script> tag.
 */
export const appearanceInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${SETTINGS_STORAGE_KEY}')||'{}');var h=document.documentElement;var M=${JSON.stringify(
  ACCENT_MAP,
)};var v=M[s.accent];if(v){h.style.setProperty('--accent-h',v[0]);h.style.setProperty('--accent-s',v[1]);h.setAttribute('data-accent',s.accent);}h.setAttribute('data-motion',s.motion||'system');if(s.density==='compact')h.setAttribute('data-density','compact');var F=${JSON.stringify(
  UI_FONT_STACK,
)};var f=F[s.uiFont];if(f){h.style.setProperty('--font-ui',f);h.setAttribute('data-ui-font',s.uiFont);}var bg=s.backgroundPattern||'${BACKGROUND_PATTERN_DEFAULT}';h.setAttribute('data-bg',bg);if(bg==='gradient')h.setAttribute('data-bg-intensity',s.bgIntensity||'${BG_INTENSITY_DEFAULT}');var e=s.effects||{};if(e.pageReveal===false)h.setAttribute('data-no-page-reveal','');if(e.typewriter===false)h.setAttribute('data-no-typewriter','');if(e.glass===false)h.setAttribute('data-no-glass','');}catch(e){}})();`;
