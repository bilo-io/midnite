'use client';

import { useCallback } from 'react';

import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';

/**
 * Read/write which per-route guides the user has run (Phase 66 Theme F). Backed
 * by the same `AppSettings` localStorage the {@link PreferenceSync} bridge
 * watches, so `seenGuides` rides the Phase 43 server sync when signed in and
 * stays device-local otherwise — no separate storage key.
 */
export function useSeenGuides(): {
  seen: string[];
  hasSeen: (id: string) => boolean;
  markSeen: (id: string) => void;
} {
  const [settings, setSettings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const seen = settings.seenGuides;

  const hasSeen = useCallback((id: string) => seen.includes(id), [seen]);

  const markSeen = useCallback(
    (id: string) => {
      setSettings((prev) =>
        prev.seenGuides.includes(id) ? prev : { ...prev, seenGuides: [...prev.seenGuides, id] },
      );
    },
    [setSettings],
  );

  return { seen, hasSeen, markSeen };
}
