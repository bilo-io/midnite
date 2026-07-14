import {
  ACCENT_SWATCH_HS,
  BACKGROUND_PATTERN_DEFAULT,
  BG_INTENSITY_DEFAULT,
  BRAND_ACCENT,
  DEFAULT_EFFECTS,
  MONO_HUE_SHIFT,
  SETTINGS_STORAGE_KEY,
  UI_FONT_STACK,
  type AccentValue,
  type BackgroundPattern,
  type BgIntensity,
  type Density,
  type Motion,
  type ShimmerDirection,
  type UiFont,
  type VisualEffects,
} from './app-settings';

/**
 * The CSS pieces an accent value maps to. `gradient` is the full `--accent-gradient`
 * value (or `null` for a solid); `solidH`/`solidS` are the primary-stop hue/sat used
 * for the **contrast-safe solid fallback** (retints `--primary`/`--ring`/`--accent`
 * so text/icons/focus never sit on a raw gradient); `preset` tags special rendering.
 */
export type AccentCssParts = {
  gradient: string | null;
  solidH: number | null;
  solidS: number | null;
  preset: string | null;
  animate: boolean;
};

/**
 * Pure, **self-contained** builder for an accent value's CSS pieces (Phase 68).
 * Deliberately free of module-level references — the swatch hue/sat map and the
 * mono-shade hue shift are passed in — so its source can be embedded verbatim in
 * the pre-paint init script below via `.toString()`, giving one implementation with
 * no drift between runtime and first-paint. `isDark` selects the stop lightness
 * ramp so gradients stay legible in both themes; `brand` renders from the
 * theme-aware `--node-*` tokens directly (no JS lightness needed).
 */
export function buildAccentCssParts(
  value: AccentValue,
  isDark: boolean,
  map: Record<string, { h: number; s: number }>,
  shift: number,
): AccentCssParts {
  if (value.kind === 'solid') {
    if (value.swatch === 'default') return { gradient: null, solidH: null, solidS: null, preset: null, animate: false };
    const hs = map[value.swatch];
    return { gradient: null, solidH: hs ? hs.h : null, solidS: hs ? hs.s : null, preset: null, animate: false };
  }
  if (value.preset === 'brand') {
    const g = `conic-gradient(from ${value.angle}deg at 50% 50%, hsl(var(--node-trigger)), hsl(var(--node-action)), hsl(var(--node-logic)), hsl(var(--node-data)), hsl(var(--node-trigger)))`;
    const hs = map[value.stops[0] || 'default'];
    return { gradient: g, solidH: hs ? hs.h : null, solidS: hs ? hs.s : null, preset: 'brand', animate: value.animate };
  }
  const stopHs: { h: number; s: number }[] = [];
  if (value.stops.length === 1) {
    const base = map[value.stops[0] ?? 'default'] ?? { h: 0, s: 0 };
    stopHs.push({ h: (base.h - shift + 360) % 360, s: base.s });
    stopHs.push({ h: (base.h + shift) % 360, s: base.s });
  } else {
    for (const id of value.stops) stopHs.push(map[id] ?? { h: 0, s: 0 });
  }
  const l0 = isDark ? 66 : 52;
  const l1 = isDark ? 50 : 40;
  const n = stopHs.length;
  const parts = stopHs.map((hs, i) => {
    const l = n === 1 ? l0 : Math.round(l0 + ((l1 - l0) * i) / (n - 1));
    return `hsl(${hs.h} ${hs.s}% ${l}%)`;
  });
  const first = parts[0] ?? 'hsl(0 0% 50%)';
  const g =
    value.type === 'conic'
      ? `conic-gradient(from ${value.angle}deg at 50% 50%, ${parts.join(', ')}, ${first})`
      : `linear-gradient(${value.angle}deg, ${parts.join(', ')})`;
  const primary = stopHs[0] ?? { h: 0, s: 0 };
  return { gradient: g, solidH: primary.h, solidS: primary.s, preset: value.preset, animate: value.animate };
}

/**
 * Apply the primary accent (Phase 68). A **solid** sets `--accent-h`/`--accent-s` +
 * `data-accent` (the Phase 39 path, theme-aware lightness in globals.css). A
 * **gradient** additionally sets `--accent-gradient` + `data-accent-gradient` (and
 * `data-accent-preset`/`data-accent-animate`), while still retinting the solid
 * tokens from its primary stop so every contrast-critical surface has a safe solid
 * fallback. `default` clears everything.
 */
export function applyAccent(value: AccentValue): void {
  const html = document.documentElement;
  const p = buildAccentCssParts(value, html.classList.contains('dark'), ACCENT_SWATCH_HS, MONO_HUE_SHIFT);
  if (p.solidH == null) {
    html.removeAttribute('data-accent');
    html.style.removeProperty('--accent-h');
    html.style.removeProperty('--accent-s');
  } else {
    html.style.setProperty('--accent-h', String(p.solidH));
    html.style.setProperty('--accent-s', String(p.solidS));
    html.setAttribute('data-accent', value.kind === 'solid' ? value.swatch : (p.preset ?? 'gradient'));
  }
  if (p.gradient) {
    html.style.setProperty('--accent-gradient', p.gradient);
    html.setAttribute('data-accent-gradient', '');
    html.setAttribute('data-accent-preset', p.preset ?? 'custom');
    html.toggleAttribute('data-accent-animate', p.animate);
  } else {
    html.style.removeProperty('--accent-gradient');
    html.removeAttribute('data-accent-gradient');
    html.removeAttribute('data-accent-preset');
    html.removeAttribute('data-accent-animate');
  }
}

/**
 * Apply the independent **secondary** accent channel (Phase 68) as `--accent-2-*`
 * + `data-accent-2` on <html> — consumed by standalone secondary UI accents and as
 * a gradient stop source. A `default` solid clears it (off).
 */
export function applyAccentSecondary(value: AccentValue): void {
  const html = document.documentElement;
  const p = buildAccentCssParts(value, html.classList.contains('dark'), ACCENT_SWATCH_HS, MONO_HUE_SHIFT);
  if (p.solidH == null && !p.gradient) {
    html.removeAttribute('data-accent-2');
    html.style.removeProperty('--accent-2-h');
    html.style.removeProperty('--accent-2-s');
    html.style.removeProperty('--accent-2-gradient');
    return;
  }
  if (p.solidH != null) {
    html.style.setProperty('--accent-2-h', String(p.solidH));
    html.style.setProperty('--accent-2-s', String(p.solidS));
  }
  html.setAttribute('data-accent-2', '');
  if (p.gradient) html.style.setProperty('--accent-2-gradient', p.gradient);
  else html.style.removeProperty('--accent-2-gradient');
}

/** Build the `--accent-gradient` CSS string for previews (theme-aware). */
export function accentGradientCss(value: AccentValue, isDark: boolean): string | null {
  return buildAccentCssParts(value, isDark, ACCENT_SWATCH_HS, MONO_HUE_SHIFT).gradient;
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

/**
 * Apply the status-pill shimmer cascade direction as `data-shimmer-dir` on <html>.
 * The default `ltr` (left pill leads) clears the attribute; `rtl` (right pill
 * leads) sets it — globals.css flips the per-pill `animation-delay` off it.
 */
export function applyShimmerDirection(dir: ShimmerDirection): void {
  const html = document.documentElement;
  if (dir === 'rtl') {
    html.setAttribute('data-shimmer-dir', 'rtl');
  } else {
    html.removeAttribute('data-shimmer-dir');
  }
}

/**
 * Inline, render-blocking script for the document <head>: applies the saved
 * accent (solid OR gradient, primary + secondary — Phase 68), motion, density,
 * font, effect, AND background prefs BEFORE first paint so a reload never flashes
 * the default look. It embeds `buildAccentCssParts` verbatim (via `.toString()`)
 * so the pre-paint gradient math is the exact same code the runtime applier uses.
 * Web's companion to `@midnite/ui`'s theme init script (kept separate so the ui
 * leaf stays ignorant of web's settings shape). Inject via a raw <script> tag.
 */
export const appearanceInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${SETTINGS_STORAGE_KEY}')||'{}');var h=document.documentElement;var isDark=h.classList.contains('dark');var MAP=${JSON.stringify(
  ACCENT_SWATCH_HS,
)};var SHIFT=${MONO_HUE_SHIFT};var BRAND=${JSON.stringify(
  BRAND_ACCENT,
)};var build=${buildAccentCssParts.toString()};
function coerce(v){return (typeof v==='string')?{kind:'solid',swatch:v}:((v&&v.kind)?v:BRAND);}
function primary(val){var p=build(val,isDark,MAP,SHIFT);if(p.solidH==null){h.removeAttribute('data-accent');h.style.removeProperty('--accent-h');h.style.removeProperty('--accent-s');}else{h.style.setProperty('--accent-h',String(p.solidH));h.style.setProperty('--accent-s',String(p.solidS));h.setAttribute('data-accent',val.kind==='solid'?val.swatch:(p.preset||'gradient'));}if(p.gradient){h.style.setProperty('--accent-gradient',p.gradient);h.setAttribute('data-accent-gradient','');h.setAttribute('data-accent-preset',p.preset||'custom');if(p.animate)h.setAttribute('data-accent-animate','');}}
function secondary(val){var p=build(val,isDark,MAP,SHIFT);if(p.solidH==null&&!p.gradient)return;if(p.solidH!=null){h.style.setProperty('--accent-2-h',String(p.solidH));h.style.setProperty('--accent-2-s',String(p.solidS));}h.setAttribute('data-accent-2','');if(p.gradient)h.style.setProperty('--accent-2-gradient',p.gradient);}
primary(coerce(s.accent===undefined?BRAND:s.accent));if(s.accentSecondary!==undefined)secondary(coerce(s.accentSecondary));h.setAttribute('data-motion',s.motion||'system');if(s.density==='compact')h.setAttribute('data-density','compact');var F=${JSON.stringify(
  UI_FONT_STACK,
)};var f=F[s.uiFont];if(f){h.style.setProperty('--font-ui',f);h.setAttribute('data-ui-font',s.uiFont);}var bg=s.backgroundPattern||'${BACKGROUND_PATTERN_DEFAULT}';h.setAttribute('data-bg',bg);if(bg==='gradient')h.setAttribute('data-bg-intensity',s.bgIntensity||'${BG_INTENSITY_DEFAULT}');var e=s.effects||{};if(e.pageReveal===false)h.setAttribute('data-no-page-reveal','');if(e.typewriter===false)h.setAttribute('data-no-typewriter','');if(e.glass===false)h.setAttribute('data-no-glass','');if(s.shimmerDirection==='rtl')h.setAttribute('data-shimmer-dir','rtl');}catch(e){}})();`;
