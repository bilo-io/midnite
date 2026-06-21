import { describe, expect, it } from 'vitest';
import { accentHues, color, radius, tokens } from './index';

describe('color tokens', () => {
  it('exposes the same semantic keys for light and dark (theming is complete)', () => {
    expect(Object.keys(color.dark).sort()).toEqual(Object.keys(color.light).sort());
  });

  it('mirrors the canonical HSL triplets from tokens.css', () => {
    expect(color.light.background).toBe('0 0% 100%');
    expect(color.dark.background).toBe('240 10% 3.9%');
    expect(color.light.foreground).toBe('240 10% 3.9%');
    expect(color.dark.foreground).toBe('0 0% 98%');
  });
});

describe('accent hues', () => {
  it('cover status, kind and node groups in both themes with matching keys', () => {
    for (const group of ['status', 'kind', 'node'] as const) {
      expect(Object.keys(accentHues[group].dark).sort()).toEqual(
        Object.keys(accentHues[group].light).sort(),
      );
    }
  });
});

describe('DS taxonomy', () => {
  it('fills radius with real values', () => {
    expect(radius.base).toBe('0.5rem');
    expect(radius.lg).toBe('0.5rem');
  });

  it('aggregates the full taxonomy in `tokens`', () => {
    expect(Object.keys(tokens).sort()).toEqual(
      ['accentHues', 'color', 'motion', 'radius', 'shadow', 'spacing', 'typography', 'zIndex'].sort(),
    );
  });

  it('marks not-yet-formalized scales as placeholders', () => {
    expect(tokens.spacing).toEqual({ placeholder: true });
    expect(tokens.typography).toEqual({ placeholder: true });
    expect(tokens.shadow).toEqual({ placeholder: true });
    expect(tokens.motion).toEqual({ placeholder: true });
    expect(tokens.zIndex.placeholder).toBe(true);
  });
});
