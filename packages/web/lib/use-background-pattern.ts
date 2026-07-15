'use client';

import { useEffect } from 'react';
import type { BackgroundPattern } from '@midnite/shared';
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
import { useDynamicBackground } from '@/lib/use-dynamic-background';

/**
 * The user's chosen background pattern for a backdrop site: the pattern id, its
 * static CSS utility class, and whether the site should render the dynamic
 * (canvas, cursor-reactive) variant instead. Reads from the same localStorage
 * settings the rest of the app uses, so changing it in Settings → Appearance
 * updates every backdrop live (cross-tab too).
 *
 * When `dynamic` is true the site should mount `<DynamicBackground>` and skip
 * both the class and its `data-bg-target` attribute (the pre-paint script would
 * otherwise paint the static pattern underneath the canvas).
 *
 * Side-effect: keeps `data-bg` + `data-bg-intensity` on `<html>` in sync with
 * live setting changes (the pre-paint init script handles the initial value before
 * React hydrates; this owns subsequent updates).
 */
export function useBackgroundPattern(): {
  pattern: BackgroundPattern;
  className: string;
  dynamic: boolean;
} {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const pattern = settings.backgroundPattern ?? BACKGROUND_PATTERN_DEFAULT;
  const intensity = settings.bgIntensity ?? BG_INTENSITY_DEFAULT;
  const dynamic = useDynamicBackground();

  useEffect(() => {
    applyBackground(pattern, intensity);
  }, [pattern, intensity]);

  return { pattern, className: BACKGROUND_PATTERN_CLASS[pattern], dynamic };
}
