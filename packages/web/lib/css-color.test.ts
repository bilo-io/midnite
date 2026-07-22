import { describe, expect, it } from 'vitest';

import { cssRgbToHex } from './css-color';

describe('cssRgbToHex', () => {
  it('converts rgb()/rgba() computed styles to #rrggbb', () => {
    expect(cssRgbToHex('rgb(9, 9, 11)')).toBe('#09090b');
    expect(cssRgbToHex('rgb(255, 255, 255)')).toBe('#ffffff');
    expect(cssRgbToHex('rgba(9, 9, 11, 0.5)')).toBe('#09090b');
    expect(cssRgbToHex(' rgb(0,0,0) ')).toBe('#000000');
  });

  it('returns null for anything that is not a plain rgb color', () => {
    expect(cssRgbToHex('transparent')).toBeNull();
    expect(cssRgbToHex('oklch(0.2 0.02 260)')).toBeNull();
    expect(cssRgbToHex('rgb(999, 0, 0)')).toBeNull();
    expect(cssRgbToHex('')).toBeNull();
  });
});
