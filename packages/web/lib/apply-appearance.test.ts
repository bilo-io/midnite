import { afterEach, describe, expect, it } from 'vitest';
import { ACCENT_OPTIONS } from './app-settings';
import {
  appearanceInitScript,
  applyAccent,
  applyBackground,
  applyDensity,
  applyEffects,
  applyMotion,
} from './apply-appearance';

afterEach(() => {
  const html = document.documentElement;
  for (const attr of ['data-accent', 'data-motion', 'data-density', 'data-bg', 'data-bg-intensity', 'data-no-page-reveal', 'data-no-typewriter', 'data-no-glass']) {
    html.removeAttribute(attr);
  }
  html.style.removeProperty('--accent-h');
  html.style.removeProperty('--accent-s');
});

describe('applyAccent', () => {
  it('sets data-accent + the hue/sat vars for a coloured accent', () => {
    applyAccent('blue');
    const html = document.documentElement;
    const blue = ACCENT_OPTIONS.find((a) => a.id === 'blue')!;
    expect(html.getAttribute('data-accent')).toBe('blue');
    expect(html.style.getPropertyValue('--accent-h')).toBe(String(blue.h));
    expect(html.style.getPropertyValue('--accent-s')).toBe(String(blue.s));
  });

  it('clears the override for the default accent', () => {
    applyAccent('violet');
    applyAccent('default');
    const html = document.documentElement;
    expect(html.hasAttribute('data-accent')).toBe(false);
    expect(html.style.getPropertyValue('--accent-h')).toBe('');
    expect(html.style.getPropertyValue('--accent-s')).toBe('');
  });

  it('clears the override for an unknown accent id', () => {
    applyAccent('blue');
    applyAccent('nope' as never);
    expect(document.documentElement.hasAttribute('data-accent')).toBe(false);
  });

  it('switches cleanly between two accents', () => {
    applyAccent('blue');
    applyAccent('amber');
    const amber = ACCENT_OPTIONS.find((a) => a.id === 'amber')!;
    expect(document.documentElement.getAttribute('data-accent')).toBe('amber');
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe(String(amber.h));
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

describe('applyBackground', () => {
  it('sets data-bg to the pattern name', () => {
    applyBackground('honeycomb', 'balanced');
    expect(document.documentElement.getAttribute('data-bg')).toBe('honeycomb');
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
  it('embeds every non-default accent so the pre-paint map stays in sync', () => {
    for (const opt of ACCENT_OPTIONS) {
      if (opt.id === 'default') continue;
      expect(appearanceInitScript).toContain(`"${opt.id}":[${opt.h},${opt.s}]`);
    }
    // Reads from the shared settings key + applies before paint.
    expect(appearanceInitScript).toContain('midnite.settings');
    expect(appearanceInitScript).toContain('data-accent');
    expect(appearanceInitScript).toContain('data-motion');
    expect(appearanceInitScript).toContain('data-density');
    expect(appearanceInitScript).toContain('data-bg');
    expect(appearanceInitScript).toContain('data-no-page-reveal');
  });

  it('runs without throwing and defaults motion to system when nothing is stored', () => {
    expect(() => {
      // eslint-disable-next-line no-eval -- exercising the inline init script body
      eval(appearanceInitScript);
    }).not.toThrow();
    // No accent stored → no override applied; motion defaults to system; bg defaults to grid.
    expect(document.documentElement.hasAttribute('data-accent')).toBe(false);
    expect(document.documentElement.getAttribute('data-motion')).toBe('system');
    expect(document.documentElement.getAttribute('data-bg')).toBe('grid');
  });
});
