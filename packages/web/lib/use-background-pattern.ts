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

/**
 * The CSS utility class for the user's chosen background pattern. Reads from the
 * same localStorage settings the rest of the app uses, so changing it in
 * Settings → Appearance updates every backdrop live (cross-tab too).
 *
 * Side-effect: sets `data-bg-intensity` on `<html>` when the animated gradient
 * is active, so the CSS `--bg-intensity` custom property can be overridden
 * by the intensity control in Appearance without a layout re-render.
 */
export function useBackgroundPattern(): string {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const pattern = settings.backgroundPattern ?? BACKGROUND_PATTERN_DEFAULT;
  const intensity = settings.bgIntensity ?? BG_INTENSITY_DEFAULT;

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-bg-pattern', pattern);
    if (pattern === 'gradient') {
      html.setAttribute('data-bg-intensity', intensity);
    } else {
      html.removeAttribute('data-bg-intensity');
    }
  }, [pattern, intensity]);

  return BACKGROUND_PATTERN_CLASS[pattern];
}
