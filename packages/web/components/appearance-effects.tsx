'use client';

import { useEffect } from 'react';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  ACCENT_DEFAULT,
  DEFAULT_EFFECTS,
  DEFAULT_SETTINGS,
  MOTION_DEFAULT,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { applyAccent, applyEffects, applyMotion } from '@/lib/apply-appearance';

/**
 * Applies global appearance preferences (accent colour, motion, per-effect
 * toggles) to <html> from the persisted settings, and keeps them in sync as the
 * user changes them (cross-tab too, via the shared localStorage hook). Mounted
 * once at the app root. The pre-paint inline script handles the first paint;
 * this owns later changes.
 */
export function AppearanceEffects() {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const accent = settings.accent ?? ACCENT_DEFAULT;
  const motion = settings.motion ?? MOTION_DEFAULT;
  const effects = settings.effects ?? DEFAULT_EFFECTS;

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    applyMotion(motion);
  }, [motion]);

  useEffect(() => {
    applyEffects(effects);
  }, [effects]);

  return null;
}
