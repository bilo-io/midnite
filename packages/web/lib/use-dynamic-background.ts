'use client';

import { useMediaQuery } from '@/hooks/use-media-query';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';

/**
 * Whether the dynamic (canvas, cursor-reactive) background should render at a
 * backdrop site right now. True only when the user turned the "Dynamic motion"
 * toggle on **and** motion isn't reduced — the Motion setting wins: `reduced`
 * always falls back to the static CSS pattern, `system` follows the OS
 * `prefers-reduced-motion`, and `full` overrides an OS reduce preference.
 *
 * SSR/first paint sees `false` (settings haven't hydrated), so every site
 * renders its static pattern first and swaps the canvas in after hydration.
 */
export function useDynamicBackground(): boolean {
  const [settings, , hydrated] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );
  const osReduced = useMediaQuery('(prefers-reduced-motion: reduce)');

  if (!hydrated || !settings.bgDynamic) return false;
  const motion = settings.motion ?? DEFAULT_SETTINGS.motion;
  if (motion === 'reduced') return false;
  if (motion === 'system' && osReduced) return false;
  return true;
}
