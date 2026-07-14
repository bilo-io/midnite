import { describe, expect, it } from 'vitest';

import {
  DEFAULT_USER_PREFERENCES,
  PreferencesResponseSchema,
  UserPreferencesSchema,
} from './preferences.js';

describe('UserPreferencesSchema', () => {
  it('parses an empty object into a complete defaults object', () => {
    expect(UserPreferencesSchema.parse({})).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('exposes sensible defaults', () => {
    expect(DEFAULT_USER_PREFERENCES).toEqual({
      theme: 'system',
      navMode: 'auto',
      backgroundPattern: 'grid',
      bgIntensity: 'balanced',
      accent: 'default',
      motion: 'system',
      density: 'comfortable',
      uiFont: 'system',
      effects: { pageReveal: true, typewriter: true, glass: true },
      shimmerDirection: 'ltr',
      inactivityTimeoutS: 30,
      cycleDurationS: 5,
      officeView: '2d',
      features: {},
      collapsedNavSections: [],
      seenGuides: {},
      autoShowGuides: true,
    });
  });

  it('accepts a versioned seenGuides map and defaults to empty (Phase 67 A)', () => {
    expect(UserPreferencesSchema.parse({ seenGuides: { board: 1, workflow: 2 } }).seenGuides).toEqual({
      board: 1,
      workflow: 2,
    });
    expect(UserPreferencesSchema.parse({}).seenGuides).toEqual({});
  });

  it('coerces a legacy string[] seenGuides blob to a version-1 map (Phase 67 A)', () => {
    // Pre-Phase-67 rows stored a flat id list; they must hydrate cleanly as v1.
    expect(UserPreferencesSchema.parse({ seenGuides: ['board', 'memory'] }).seenGuides).toEqual({
      board: 1,
      memory: 1,
    });
    expect(UserPreferencesSchema.parse({ seenGuides: [] }).seenGuides).toEqual({});
  });

  it('defaults autoShowGuides to true and accepts false (Phase 67 A)', () => {
    expect(UserPreferencesSchema.parse({}).autoShowGuides).toBe(true);
    expect(UserPreferencesSchema.parse({ autoShowGuides: false }).autoShowGuides).toBe(false);
  });

  it('defaults officeView to 2d and accepts 3d (Phase 63 F)', () => {
    expect(UserPreferencesSchema.parse({}).officeView).toBe('2d');
    expect(UserPreferencesSchema.parse({ officeView: '3d' }).officeView).toBe('3d');
    expect(UserPreferencesSchema.safeParse({ officeView: 'vr' }).success).toBe(false);
  });

  it('applies a partial blob over the defaults', () => {
    const prefs = UserPreferencesSchema.parse({ accent: 'blue', theme: 'dark' });
    expect(prefs.accent).toBe('blue');
    expect(prefs.theme).toBe('dark');
    // Untouched fields fall back to defaults.
    expect(prefs.density).toBe('comfortable');
    expect(prefs.effects).toEqual({ pageReveal: true, typewriter: true, glass: true });
  });

  it('fills partial nested effects with their own defaults', () => {
    const prefs = UserPreferencesSchema.parse({ effects: { glass: false } });
    expect(prefs.effects).toEqual({ pageReveal: true, typewriter: true, glass: false });
  });

  it('strips unknown keys rather than rejecting them', () => {
    const prefs = UserPreferencesSchema.parse({ accent: 'rose', futureKey: 'whatever' });
    expect(prefs.accent).toBe('rose');
    expect(prefs).not.toHaveProperty('futureKey');
  });

  it('round-trips a full preferences object', () => {
    const full = {
      theme: 'time' as const,
      navMode: 'expanded' as const,
      backgroundPattern: 'aurora' as const,
      bgIntensity: 'bold' as const,
      accent: 'emerald' as const,
      motion: 'reduced' as const,
      density: 'compact' as const,
      uiFont: 'serif' as const,
      effects: { pageReveal: false, typewriter: false, glass: false },
      shimmerDirection: 'rtl' as const,
      inactivityTimeoutS: 120,
      cycleDurationS: 8,
      officeView: '3d' as const,
      features: { office: true, workflows: false },
      collapsedNavSections: ['agents'],
      seenGuides: { board: 1, memory: 3 },
      autoShowGuides: false,
    };
    expect(UserPreferencesSchema.parse(full)).toEqual(full);
  });

  it('rejects an invalid enum value', () => {
    expect(() => UserPreferencesSchema.parse({ accent: 'chartreuse' })).toThrow();
  });

  it('keeps an arbitrary feature map (loose contract)', () => {
    const prefs = UserPreferencesSchema.parse({ features: { anyKey: true, another: false } });
    expect(prefs.features).toEqual({ anyKey: true, another: false });
  });
});

describe('PreferencesResponseSchema', () => {
  it('accepts a null updatedAt for a user who has never saved', () => {
    const res = PreferencesResponseSchema.parse({ preferences: {}, updatedAt: null });
    expect(res.preferences).toEqual(DEFAULT_USER_PREFERENCES);
    expect(res.updatedAt).toBeNull();
  });

  it('accepts an ISO updatedAt', () => {
    const res = PreferencesResponseSchema.parse({
      preferences: { accent: 'cyan' },
      updatedAt: '2026-06-30T12:00:00.000Z',
    });
    expect(res.preferences.accent).toBe('cyan');
    expect(res.updatedAt).toBe('2026-06-30T12:00:00.000Z');
  });
});
