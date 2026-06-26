import {
  ACCENT_OPTIONS,
  DEFAULT_EFFECTS,
  SETTINGS_STORAGE_KEY,
  type AccentId,
  type Motion,
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
 * accent + motion + effect prefs BEFORE first paint so a reload never flashes
 * the default look. Web's companion to `@midnite/ui`'s theme init script (kept
 * separate so the ui leaf stays ignorant of web's settings shape). Inject via a
 * raw <script> tag.
 */
export const appearanceInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${SETTINGS_STORAGE_KEY}')||'{}');var h=document.documentElement;var M=${JSON.stringify(
  ACCENT_MAP,
)};var v=M[s.accent];if(v){h.style.setProperty('--accent-h',v[0]);h.style.setProperty('--accent-s',v[1]);h.setAttribute('data-accent',s.accent);}h.setAttribute('data-motion',s.motion||'system');var e=s.effects||{};if(e.pageReveal===false)h.setAttribute('data-no-page-reveal','');if(e.typewriter===false)h.setAttribute('data-no-typewriter','');if(e.glass===false)h.setAttribute('data-no-glass','');}catch(e){}})();`;
