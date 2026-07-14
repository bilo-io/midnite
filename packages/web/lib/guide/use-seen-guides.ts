'use client';

import { useCallback } from 'react';

import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';

import { ALL_GUIDES, type Guide } from './steps';

/**
 * Read/write which per-route guides the user has run, **version-aware** (Phase
 * 67 A — was a flat id list in Phase 66 F). Backed by the same `AppSettings`
 * localStorage the {@link PreferenceSync} bridge watches, so `seenGuides` rides
 * the Phase 43 server sync when signed in and stays device-local otherwise — no
 * separate storage key.
 *
 * `seenGuides` is a `guide id → version seen` map. A guide counts as *seen* only
 * when the stored version is `>=` the guide's current {@link Guide.version}, so
 * bumping a guide's `version` re-surfaces it. Legacy `string[]` blobs are coerced
 * to `{ id: 1 }` on read by the shared schema, so old rows hydrate cleanly.
 */
export function useSeenGuides(): {
  seen: Record<string, number>;
  hasSeen: (guide: Guide) => boolean;
  markSeen: (guide: Guide) => void;
  /** True when any shipped guide is unseen at its current version. */
  hasAnyUnseen: boolean;
} {
  const [settings, setSettings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const seen = settings.seenGuides;

  const hasSeen = useCallback((guide: Guide) => (seen[guide.id] ?? 0) >= guide.version, [seen]);

  const markSeen = useCallback(
    (guide: Guide) => {
      setSettings((prev) =>
        (prev.seenGuides[guide.id] ?? 0) >= guide.version
          ? prev
          : { ...prev, seenGuides: { ...prev.seenGuides, [guide.id]: guide.version } },
      );
    },
    [setSettings],
  );

  const hasAnyUnseen = ALL_GUIDES.some((guide) => (seen[guide.id] ?? 0) < guide.version);

  return { seen, hasSeen, markSeen, hasAnyUnseen };
}
