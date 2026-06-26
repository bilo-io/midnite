'use client';

import { useEffect } from 'react';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  BACKGROUND_PATTERN_CLASS,
  BACKGROUND_PATTERN_DEFAULT,
  BG_INTENSITY_DEFAULT,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { applyBackground } from '@/lib/apply-appearance';

/**
 * The CSS utility class for the user's chosen background pattern. Reads from the
 * same localStorage settings the rest of the app uses, so changing it in
 * Settings → Appearance updates every backdrop live (cross-tab too).
 *
 * Side-effect: keeps `data-bg` + `data-bg-intensity` on `<html>` in sync with
 * live setting changes (the pre-paint init script handles the initial value before
 * React hydrates; this owns subsequent updates).
 */
export function useBackgroundPattern(): string {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const pattern = settings.backgroundPattern ?? BACKGROUND_PATTERN_DEFAULT;
  const intensity = settings.bgIntensity ?? BG_INTENSITY_DEFAULT;

  useEffect(() => {
    applyBackground(pattern, intensity);
  }, [pattern, intensity]);

  return BACKGROUND_PATTERN_CLASS[pattern];
}
