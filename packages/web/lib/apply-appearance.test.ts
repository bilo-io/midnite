import { afterEach, describe, expect, it } from 'vitest';
import { ACCENT_OPTIONS } from './app-settings';
import { appearanceInitScript, applyAccent } from './apply-appearance';

afterEach(() => {
  const html = document.documentElement;
  html.removeAttribute('data-accent');
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

describe('appearanceInitScript', () => {
  it('embeds every non-default accent so the pre-paint map stays in sync', () => {
    for (const opt of ACCENT_OPTIONS) {
      if (opt.id === 'default') continue;
      expect(appearanceInitScript).toContain(`"${opt.id}":[${opt.h},${opt.s}]`);
    }
    // Reads from the shared settings key + applies before paint.
    expect(appearanceInitScript).toContain('midnite.settings');
    expect(appearanceInitScript).toContain('data-accent');
  });

  it('runs without throwing when applied to the document (no stored accent)', () => {
    expect(() => {
      // eslint-disable-next-line no-eval -- exercising the inline init script body
      eval(appearanceInitScript);
    }).not.toThrow();
    // No accent stored → no override applied.
    expect(document.documentElement.hasAttribute('data-accent')).toBe(false);
  });
});
