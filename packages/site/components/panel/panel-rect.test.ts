import { describe, expect, it } from 'vitest';

import { panelRectFor } from './panel-rect';

const VW = 1440;
const VH = 900;

describe('panelRectFor', () => {
  it('centres the hero rect horizontally and keeps it on-screen', () => {
    const r = panelRectFor('hero', VW, VH);
    expect(r.x + r.width / 2).toBe(VW / 2);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y + r.height).toBeLessThanOrEqual(VH);
    expect(r.width).toBeGreaterThanOrEqual(300);
    expect(r.width).toBeLessThanOrEqual(420);
  });

  it('offsets right and left placements to opposite sides, on-screen', () => {
    const right = panelRectFor('right', VW, VH);
    const left = panelRectFor('left', VW, VH);
    expect(left.x).toBeLessThan(right.x);
    expect(left.x).toBeGreaterThanOrEqual(0);
    expect(right.x + right.width).toBeLessThanOrEqual(VW);
  });

  it('reuses the right rect for hidden (it fades out, so position is moot)', () => {
    expect(panelRectFor('hidden', VW, VH)).toEqual(panelRectFor('right', VW, VH));
  });
});
