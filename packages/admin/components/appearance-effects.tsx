'use client';

import { useEffect } from 'react';
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
import { useLocalStorage } from '@/lib/use-local-storage';
import { ACCENT_DEFAULT, DEFAULT_SETTINGS, SECONDARY_ACCENT_OFF, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';

/**
 * Applies global appearance preferences to <html> from persisted settings and keeps
 * them in sync as the user changes them (cross-tab too). Mounted once at the app
 * root. The pre-paint inline script (`appearanceInitScript`) handles the first
 * paint; this owns later changes. Trimmed mirror of web's `AppearanceEffects` —
 * every appearance field is populated by `DEFAULT_SETTINGS`, so no per-field
 * fallback is needed (only the accent channels are coerced for legacy shapes).
 */
export function AppearanceEffects() {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  // Coerce on read: pre-Phase-68 localStorage stored a bare swatch string, which
  // bypasses the shared zod preprocess and would crash the gradient builder.
  const accent = coerceAccentValue(settings.accent, ACCENT_DEFAULT);
  const accentSecondary = coerceAccentValue(settings.accentSecondary, SECONDARY_ACCENT_OFF);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    applyAccentSecondary(accentSecondary);
  }, [accentSecondary]);

  // Gradient stop lightness is theme-aware and computed in JS, so re-apply both
  // accent channels whenever the `.dark` class on <html> toggles.
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
    applyMotion(settings.motion);
  }, [settings.motion]);

  useEffect(() => {
    applyDensity(settings.density);
  }, [settings.density]);

  useEffect(() => {
    applyUiFont(settings.uiFont);
  }, [settings.uiFont]);

  useEffect(() => {
    applyBackground(settings.backgroundPattern, settings.bgIntensity);
  }, [settings.backgroundPattern, settings.bgIntensity]);

  useEffect(() => {
    applyEffects(settings.effects);
  }, [settings.effects]);

  useEffect(() => {
    applyShimmerDirection(settings.shimmerDirection);
  }, [settings.shimmerDirection]);

  return null;
}
