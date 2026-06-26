'use client';

import { useEffect, useState } from 'react';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_EFFECTS,
  DEFAULT_SETTINGS,
  MOTION_DEFAULT,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';

/**
 * Resolves the effective motion preference for JS-driven effects that CSS can't
 * gate (e.g. the page-header typewriter). Combines the `motion` setting with the
 * OS `prefers-reduced-motion` query and the per-effect toggles:
 *   - `full`    → always animate (overrides the OS), unless the effect is off.
 *   - `reduced` → never animate.
 *   - `system`  → animate unless the OS prefers reduced.
 */
export function useAnimationPrefs(): { animate: boolean; typewriter: boolean } {
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const motion = settings.motion ?? MOTION_DEFAULT;
  const effects = settings.effects ?? DEFAULT_EFFECTS;

  const [osReduce, setOsReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setOsReduce(mq.matches);
    const onChange = () => setOsReduce(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const animate = motion === 'full' ? true : motion === 'reduced' ? false : !osReduce;
  return { animate, typewriter: animate && (effects.typewriter ?? true) };
}
