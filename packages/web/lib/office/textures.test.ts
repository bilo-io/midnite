import { describe, expect, it } from 'vitest';
import type { PlantVariant } from './layout';
import { plantTexture, TEX } from './textures';

describe('plantTexture (Phase 9 B2 plant species)', () => {
  it('maps each variant to its own texture key', () => {
    expect(plantTexture('leafy')).toBe(TEX.plant);
    expect(plantTexture('palm')).toBe(TEX.plantPalm);
    expect(plantTexture('succulent')).toBe(TEX.plantSucculent);
  });

  it('gives the three species three distinct textures', () => {
    const variants: PlantVariant[] = ['leafy', 'palm', 'succulent'];
    expect(new Set(variants.map(plantTexture)).size).toBe(3);
  });
});
