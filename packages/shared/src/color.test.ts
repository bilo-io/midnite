import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  isHexColor,
  normalizeHex,
  readableTextColor,
  relativeLuminance,
} from './color.js';

describe('normalizeHex', () => {
  it('expands shorthand and lowercases', () => {
    expect(normalizeHex('#FFF')).toBe('#ffffff');
    expect(normalizeHex('abc')).toBe('#aabbcc');
    expect(normalizeHex('#7C3AED')).toBe('#7c3aed');
  });

  it('throws on invalid input', () => {
    expect(() => normalizeHex('nope')).toThrow();
    expect(() => normalizeHex('#12')).toThrow();
  });
});

describe('isHexColor', () => {
  it('accepts valid, rejects invalid', () => {
    expect(isHexColor('#fff')).toBe(true);
    expect(isHexColor('7c3aed')).toBe(true);
    expect(isHexColor('rgb(0,0,0)')).toBe(false);
  });
});

describe('relativeLuminance', () => {
  it('orders black < mid < white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    const mid = relativeLuminance('#808080');
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
});

describe('readableTextColor', () => {
  it('picks dark text on light backgrounds', () => {
    expect(readableTextColor('#ffffff')).toBe('#000000');
    expect(readableTextColor('#fde047')).toBe('#000000'); // amber
    expect(readableTextColor('#38bdf8')).toBe('#000000'); // sky
  });

  it('picks light text on dark backgrounds', () => {
    expect(readableTextColor('#000000')).toBe('#ffffff');
    expect(readableTextColor('#7c3aed')).toBe('#ffffff'); // violet
    expect(readableTextColor('#1e293b')).toBe('#ffffff'); // slate
  });
});
