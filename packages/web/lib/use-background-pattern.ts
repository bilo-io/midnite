'use client';

import { useLocalStorage } from '@/lib/use-local-storage';
import {
  BACKGROUND_PATTERN_CLASS,
  BACKGROUND_PATTERN_DEFAULT,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';

/**
 * The CSS utility class for the user's chosen background pattern. Reads from the
 * same localStorage settings the rest of the app uses, so changing it in
 * Settings → Appearance updates every backdrop live (cross-tab too).
 */
export function useBackgroundPattern(): string {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  return BACKGROUND_PATTERN_CLASS[settings.backgroundPattern ?? BACKGROUND_PATTERN_DEFAULT];
}
