'use client';

import { useEffect } from 'react';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  ACCENT_DEFAULT,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { applyAccent } from '@/lib/apply-appearance';

/**
 * Applies global appearance preferences (currently the accent colour) to <html>
 * from the persisted settings, and keeps them in sync as the user changes them
 * (cross-tab too, via the shared localStorage hook). Mounted once at the app root.
 * The pre-paint inline script handles the first paint; this owns later changes.
 */
export function AppearanceEffects() {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const accent = settings.accent ?? ACCENT_DEFAULT;

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  return null;
}
