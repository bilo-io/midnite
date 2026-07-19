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
  SECONDARY_ACCENT_OFF,
  SETTINGS_STORAGE_KEY,
  SHIMMER_DIRECTION_DEFAULT,
  UI_FONT_DEFAULT,
  type AppSettings,
} from '@/lib/app-settings';
import {
  applyAccent,
  applyAccentSecondary,
  applyBackground,
  applyDensity,
  applyEffects,
  applyMotion,
  applyShimmerDirection,
  applyUiFont,
  coerceAccentValue,
} from '@midnite/shell';

/**
 * Applies global appearance preferences to <html> from persisted settings and keeps
 * them in sync as the user changes them (cross-tab too, via the shared localStorage
 * hook). Mounted once at the app root. The pre-paint inline script handles the first
 * paint; this owns later changes.
 */
export function AppearanceEffects() {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  // Coerce on read: pre-Phase-68 localStorage stored a bare swatch string, which
  // bypasses the shared zod preprocess and would crash the gradient builder.
  const accent = coerceAccentValue(settings.accent, ACCENT_DEFAULT);
  const accentSecondary = coerceAccentValue(settings.accentSecondary, SECONDARY_ACCENT_OFF);
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
    applyAccentSecondary(accentSecondary);
  }, [accentSecondary]);

  // Gradient stop lightness is theme-aware and computed in JS, so re-apply both
  // accent channels whenever the `.dark` class on <html> toggles (theme switch /
  // time-of-day flip). Solid accents resolve their lightness in CSS, so this is a
  // no-op cost for them.
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      applyAccent(accent);
      applyAccentSecondary(accentSecondary);
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [accent, accentSecondary]);

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
