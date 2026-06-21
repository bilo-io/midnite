import { describe, expect, it } from 'vitest';
import type { LlmProvider } from '@midnite/shared';
import type { PlantVariant } from './layout';
import { plantTexture, providerAccent, TEX } from './textures';

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

describe('providerAccent (Phase 9 B1 provider-aware characters)', () => {
  it('gives each known provider a distinct accent colour', () => {
    const providers: LlmProvider[] = ['anthropic', 'openai', 'google', 'openai-compatible'];
    const colours = providers.map((p) => providerAccent(p));
    expect(colours.every((c) => typeof c === 'number')).toBe(true);
    expect(new Set(colours).size).toBe(providers.length);
  });

  it('returns null for an unknown/absent provider (no pip)', () => {
    expect(providerAccent(undefined)).toBeNull();
  });
});
