import { afterEach, describe, expect, it } from 'vitest';
import { ACCENT_OPTIONS, ACCENT_SWATCH_HS, BRAND_ACCENT, MONO_HUE_SHIFT, UI_FONT_STACK, type AccentValue } from './app-settings';
import {
  accentGradientCss,
  appearanceInitScript,
  applyAccent,
  applyAccentSecondary,
  buildAccentCssParts,
  coerceAccentValue,
  applyBackground,
  applyDensity,
  applyEffects,
  applyMotion,
  applyUiFont,
} from './apply-appearance';

const solid = (swatch: string): AccentValue => ({ kind: 'solid', swatch: swatch as never });

afterEach(() => {
  const html = document.documentElement;
  for (const attr of [
    'data-accent', 'data-accent-gradient', 'data-accent-preset', 'data-accent-animate', 'data-accent-2',
    'data-motion', 'data-density', 'data-ui-font', 'data-bg', 'data-bg-intensity',
    'data-no-page-reveal', 'data-no-typewriter', 'data-no-glass',
  ]) {
    html.removeAttribute(attr);
  }
  html.classList.remove('dark');
  for (const v of ['--accent-h', '--accent-s', '--accent-gradient', '--accent-2-h', '--accent-2-s', '--accent-2-gradient', '--font-ui']) {
    html.style.removeProperty(v);
  }
});

describe('applyAccent — solids', () => {
  it('sets data-accent + the hue/sat vars for a coloured solid accent', () => {
    applyAccent(solid('blue'));
    const html = document.documentElement;
    const blue = ACCENT_OPTIONS.find((a) => a.id === 'blue')!;
    expect(html.getAttribute('data-accent')).toBe('blue');
    expect(html.style.getPropertyValue('--accent-h')).toBe(String(blue.h));
    expect(html.style.getPropertyValue('--accent-s')).toBe(String(blue.s));
    expect(html.hasAttribute('data-accent-gradient')).toBe(false);
  });

  it('clears the override for the default solid accent', () => {
    applyAccent(solid('violet'));
    applyAccent(solid('default'));
    const html = document.documentElement;
    expect(html.hasAttribute('data-accent')).toBe(false);
    expect(html.style.getPropertyValue('--accent-h')).toBe('');
    expect(html.style.getPropertyValue('--accent-s')).toBe('');
  });

  it('switches cleanly between two solid accents', () => {
    applyAccent(solid('blue'));
    applyAccent(solid('amber'));
    const amber = ACCENT_OPTIONS.find((a) => a.id === 'amber')!;
    expect(document.documentElement.getAttribute('data-accent')).toBe('amber');
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe(String(amber.h));
  });
});

describe('applyAccent — gradients', () => {
  it('sets --accent-gradient + data attributes for a linear multi-stop gradient, plus a solid fallback from the primary stop', () => {
    applyAccent({ kind: 'gradient', preset: 'custom', type: 'linear', stops: ['blue', 'rose'], angle: 45, animate: false });
    const html = document.documentElement;
    expect(html.hasAttribute('data-accent-gradient')).toBe(true);
    expect(html.getAttribute('data-accent-preset')).toBe('custom');
    const g = html.style.getPropertyValue('--accent-gradient');
    expect(g).toContain('linear-gradient(45deg');
    // Contrast-safe solid fallback = primary stop (blue).
    expect(html.style.getPropertyValue('--accent-h')).toBe(String(ACCENT_SWATCH_HS.blue.h));
    expect(html.getAttribute('data-accent')).toBe('custom');
  });

  it('renders the brand gradient as a Dusk-like blue→violet→rose linear sweep', () => {
    applyAccent(BRAND_ACCENT);
    const html = document.documentElement;
    expect(html.getAttribute('data-accent-preset')).toBe('brand');
    const g = html.style.getPropertyValue('--accent-gradient');
    expect(g).toContain('linear-gradient');
    // Blue holds to 28% before the transition (extra blue on the purple side).
    // The brand blue is intentionally deepened + saturated vs. the plain "blue"
    // swatch (220/90 rather than the swatch's 217/80) for a stronger blue shoulder.
    expect(g).toContain('hsl(220 90%');
    expect(g).toMatch(/28%/);
    expect(g).toContain(`hsl(${ACCENT_SWATCH_HS.violet.h}`);
    expect(g).toContain(`hsl(${ACCENT_SWATCH_HS.rose.h}`);
  });

  it('expands a single-stop gradient into a mono-shade (hue-adjacent) sweep', () => {
    const parts = buildAccentCssParts({ kind: 'gradient', preset: 'custom', type: 'linear', stops: ['cyan'], angle: 90, animate: false }, false, ACCENT_SWATCH_HS, MONO_HUE_SHIFT);
    const base = ACCENT_SWATCH_HS.cyan.h;
    expect(parts.gradient).toContain(`${(base - MONO_HUE_SHIFT + 360) % 360} `);
    expect(parts.gradient).toContain(`${(base + MONO_HUE_SHIFT) % 360} `);
  });

  it('uses a darker lightness ramp in dark mode', () => {
    const light = accentGradientCss({ kind: 'gradient', preset: 'custom', type: 'linear', stops: ['blue', 'rose'], angle: 0, animate: false }, false);
    const dark = accentGradientCss({ kind: 'gradient', preset: 'custom', type: 'linear', stops: ['blue', 'rose'], angle: 0, animate: false }, true);
    expect(light).not.toBe(dark);
  });

  it('toggles data-accent-animate off the animate flag', () => {
    applyAccent({ kind: 'gradient', preset: 'custom', type: 'linear', stops: ['blue', 'rose'], angle: 0, animate: true });
    expect(document.documentElement.hasAttribute('data-accent-animate')).toBe(true);
    applyAccent(solid('blue'));
    expect(document.documentElement.hasAttribute('data-accent-animate')).toBe(false);
  });

  it('drives the angle from --accent-angle when animated (static uses a literal)', () => {
    const animated = accentGradientCss({ kind: 'gradient', preset: 'custom', type: 'linear', stops: ['blue', 'rose'], angle: 45, animate: true }, false);
    expect(animated).toContain('linear-gradient(var(--accent-angle)');
    const staticG = accentGradientCss({ kind: 'gradient', preset: 'custom', type: 'linear', stops: ['blue', 'rose'], angle: 45, animate: false }, false);
    expect(staticG).toContain('linear-gradient(45deg');
  });

  it('clears gradient state when switching to a solid', () => {
    applyAccent(BRAND_ACCENT);
    applyAccent(solid('emerald'));
    const html = document.documentElement;
    expect(html.hasAttribute('data-accent-gradient')).toBe(false);
    expect(html.style.getPropertyValue('--accent-gradient')).toBe('');
  });
});

describe('applyAccentSecondary', () => {
  it('sets --accent-2-* + data-accent-2 for a solid secondary', () => {
    applyAccentSecondary(solid('emerald'));
    const html = document.documentElement;
    expect(html.hasAttribute('data-accent-2')).toBe(true);
    expect(html.style.getPropertyValue('--accent-2-h')).toBe(String(ACCENT_SWATCH_HS.emerald.h));
  });

  it('clears the secondary channel when off (default)', () => {
    applyAccentSecondary(solid('emerald'));
    applyAccentSecondary(solid('default'));
    const html = document.documentElement;
    expect(html.hasAttribute('data-accent-2')).toBe(false);
    expect(html.style.getPropertyValue('--accent-2-h')).toBe('');
  });
});

describe('applyMotion', () => {
  it('sets data-motion to the literal preference', () => {
    applyMotion('reduced');
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');
    applyMotion('full');
    expect(document.documentElement.getAttribute('data-motion')).toBe('full');
    applyMotion('system');
    expect(document.documentElement.getAttribute('data-motion')).toBe('system');
  });
});

describe('applyDensity', () => {
  it('sets data-density="compact" for compact mode', () => {
    applyDensity('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('removes data-density for comfortable (default)', () => {
    applyDensity('compact');
    applyDensity('comfortable');
    expect(document.documentElement.hasAttribute('data-density')).toBe(false);
  });
});

describe('applyUiFont', () => {
  it('sets --font-ui + data-ui-font for a non-system font', () => {
    applyUiFont('serif');
    const html = document.documentElement;
    expect(html.getAttribute('data-ui-font')).toBe('serif');
    expect(html.style.getPropertyValue('--font-ui')).toBe(UI_FONT_STACK.serif);
  });

  it('clears the override for the system font (default)', () => {
    applyUiFont('mono');
    applyUiFont('system');
    const html = document.documentElement;
    expect(html.hasAttribute('data-ui-font')).toBe(false);
    expect(html.style.getPropertyValue('--font-ui')).toBe('');
  });

  it('clears the override for an unknown font id', () => {
    applyUiFont('grotesk');
    applyUiFont('nope' as never);
    expect(document.documentElement.hasAttribute('data-ui-font')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--font-ui')).toBe('');
  });

  it('switches cleanly between two fonts', () => {
    applyUiFont('serif');
    applyUiFont('mono');
    expect(document.documentElement.getAttribute('data-ui-font')).toBe('mono');
    expect(document.documentElement.style.getPropertyValue('--font-ui')).toBe(UI_FONT_STACK.mono);
  });
});

describe('applyBackground', () => {
  it('sets data-bg to the pattern name', () => {
    applyBackground('starfield', 'balanced');
    expect(document.documentElement.getAttribute('data-bg')).toBe('starfield');
    expect(document.documentElement.hasAttribute('data-bg-intensity')).toBe(false);
  });

  it('sets data-bg-intensity only for the animated gradient', () => {
    applyBackground('gradient', 'bold');
    expect(document.documentElement.getAttribute('data-bg')).toBe('gradient');
    expect(document.documentElement.getAttribute('data-bg-intensity')).toBe('bold');
  });

  it('clears data-bg-intensity when switching away from gradient', () => {
    applyBackground('gradient', 'subtle');
    applyBackground('dots', 'balanced');
    expect(document.documentElement.getAttribute('data-bg')).toBe('dots');
    expect(document.documentElement.hasAttribute('data-bg-intensity')).toBe(false);
  });

  it('switches cleanly between two non-gradient patterns', () => {
    applyBackground('grid', 'balanced');
    applyBackground('blueprint', 'balanced');
    expect(document.documentElement.getAttribute('data-bg')).toBe('blueprint');
  });
});

describe('applyEffects', () => {
  it('sets data-no-* attributes only for disabled effects', () => {
    applyEffects({ pageReveal: false, typewriter: true, glass: false });
    const html = document.documentElement;
    expect(html.hasAttribute('data-no-page-reveal')).toBe(true);
    expect(html.hasAttribute('data-no-typewriter')).toBe(false);
    expect(html.hasAttribute('data-no-glass')).toBe(true);
  });

  it('clears attributes when effects are re-enabled', () => {
    applyEffects({ pageReveal: false, typewriter: false, glass: false });
    applyEffects({ pageReveal: true, typewriter: true, glass: true });
    const html = document.documentElement;
    expect(html.hasAttribute('data-no-page-reveal')).toBe(false);
    expect(html.hasAttribute('data-no-typewriter')).toBe(false);
    expect(html.hasAttribute('data-no-glass')).toBe(false);
  });
});

describe('appearanceInitScript', () => {
  it('embeds every swatch hue/sat so the pre-paint gradient math stays in sync', () => {
    for (const opt of ACCENT_OPTIONS) {
      expect(appearanceInitScript).toContain(`"${opt.id}":{"h":${opt.h},"s":${opt.s}}`);
    }
    // Reads from the shared settings key + applies before paint.
    expect(appearanceInitScript).toContain('midnite.settings');
    expect(appearanceInitScript).toContain('data-accent');
    expect(appearanceInitScript).toContain('data-accent-gradient');
    expect(appearanceInitScript).toContain('data-accent-2');
    expect(appearanceInitScript).toContain('data-motion');
    expect(appearanceInitScript).toContain('data-density');
    expect(appearanceInitScript).toContain('data-ui-font');
    expect(appearanceInitScript).toContain('--font-ui');
    expect(appearanceInitScript).toContain('data-bg');
    expect(appearanceInitScript).toContain('data-no-page-reveal');
  });

  it('embeds the UI-font stacks so the pre-paint map stays in sync', () => {
    for (const [id, stack] of Object.entries(UI_FONT_STACK)) {
      expect(appearanceInitScript).toContain(JSON.stringify(id));
      expect(appearanceInitScript).toContain(JSON.stringify(stack));
    }
  });

  it('applies a stored non-system UI font before paint', () => {
    localStorage.setItem('midnite.settings', JSON.stringify({ uiFont: 'serif' }));
    eval(appearanceInitScript);
    expect(document.documentElement.getAttribute('data-ui-font')).toBe('serif');
    expect(document.documentElement.style.getPropertyValue('--font-ui')).toBe(UI_FONT_STACK.serif);
    localStorage.clear();
  });

  it('applies the brand gradient before paint when nothing is stored', () => {
    localStorage.clear();
    expect(() => {
      eval(appearanceInitScript);
    }).not.toThrow();
    const html = document.documentElement;
    // No accent stored → the brand gradient default applies pre-paint (Phase 68).
    expect(html.getAttribute('data-accent-preset')).toBe('brand');
    expect(html.hasAttribute('data-accent-gradient')).toBe(true);
    expect(html.style.getPropertyValue('--accent-gradient')).toContain('linear-gradient');
    // Motion defaults to system; bg defaults to the neuro-cloud starfield; no uiFont override.
    expect(html.getAttribute('data-motion')).toBe('system');
    expect(html.getAttribute('data-bg')).toBe('starfield');
    expect(html.hasAttribute('data-ui-font')).toBe(false);
  });

  it('coerces a legacy string accent to a solid before paint', () => {
    localStorage.setItem('midnite.settings', JSON.stringify({ accent: 'violet' }));
    eval(appearanceInitScript);
    expect(document.documentElement.getAttribute('data-accent')).toBe('violet');
    expect(document.documentElement.hasAttribute('data-accent-gradient')).toBe(false);
    localStorage.clear();
  });
});

describe('coerceAccentValue — legacy persisted shapes (runtime read path)', () => {
  it('coerces a pre-Phase-68 bare-string accent to a solid', () => {
    expect(coerceAccentValue('violet', BRAND_ACCENT)).toEqual({ kind: 'solid', swatch: 'violet' });
  });

  it('passes a valid Phase-68 value through untouched', () => {
    const gradient: AccentValue = { kind: 'gradient', preset: 'custom', type: 'linear', stops: ['blue', 'violet'], angle: 90, animate: false };
    expect(coerceAccentValue(gradient, BRAND_ACCENT)).toBe(gradient);
    expect(coerceAccentValue(solid('blue'), BRAND_ACCENT)).toEqual(solid('blue'));
  });

  it('falls back on null/undefined/shapeless garbage', () => {
    expect(coerceAccentValue(undefined, BRAND_ACCENT)).toBe(BRAND_ACCENT);
    expect(coerceAccentValue(null, BRAND_ACCENT)).toBe(BRAND_ACCENT);
    expect(coerceAccentValue({ stops: ['blue'] }, BRAND_ACCENT)).toBe(BRAND_ACCENT);
  });

  it('regression: applying a coerced legacy string accent does not throw', () => {
    // Uncoerced, a legacy string fell through both kind checks in
    // buildAccentCssParts and crashed on `value.stops.length`.
    expect(() => applyAccent(coerceAccentValue('violet', BRAND_ACCENT))).not.toThrow();
    expect(document.documentElement.getAttribute('data-accent')).toBe('violet');
  });
});
