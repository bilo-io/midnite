'use client';

import { useEffect } from 'react';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  ACCENT_DEFAULT,
  BACKGROUND_PATTERN_DEFAULT,
  BG_INTENSITY_DEFAULT,
  DEFAULT_EFFECTS,
  DEFAULT_SETTINGS,
  DENSITY_DEFAULT,
  MOTION_DEFAULT,
  SETTINGS_STORAGE_KEY,
  SHIMMER_DIRECTION_DEFAULT,
  UI_FONT_DEFAULT,
  type AppSettings,
} from '@/lib/app-settings';
import {
  applyAccent,
  applyBackground,
  applyDensity,
  applyEffects,
  applyMotion,
  applyShimmerDirection,
  applyUiFont,
} from '@/lib/apply-appearance';

/**
 * Applies global appearance preferences to <html> from persisted settings and keeps
 * them in sync as the user changes them (cross-tab too, via the shared localStorage
 * hook). Mounted once at the app root. The pre-paint inline script handles the first
 * paint; this owns later changes.
 */
export function AppearanceEffects() {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const accent = settings.accent ?? ACCENT_DEFAULT;
  const motion = settings.motion ?? MOTION_DEFAULT;
  const density = settings.density ?? DENSITY_DEFAULT;
  const uiFont = settings.uiFont ?? UI_FONT_DEFAULT;
  const effects = settings.effects ?? DEFAULT_EFFECTS;
  const backgroundPattern = settings.backgroundPattern ?? BACKGROUND_PATTERN_DEFAULT;
  const bgIntensity = settings.bgIntensity ?? BG_INTENSITY_DEFAULT;
  const shimmerDirection = settings.shimmerDirection ?? SHIMMER_DIRECTION_DEFAULT;

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    applyMotion(motion);
  }, [motion]);

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  useEffect(() => {
    applyUiFont(uiFont);
  }, [uiFont]);

  useEffect(() => {
    applyBackground(backgroundPattern, bgIntensity);
  }, [backgroundPattern, bgIntensity]);

  useEffect(() => {
    applyEffects(effects);
  }, [effects]);

  useEffect(() => {
    applyShimmerDirection(shimmerDirection);
  }, [shimmerDirection]);

  return null;
}
