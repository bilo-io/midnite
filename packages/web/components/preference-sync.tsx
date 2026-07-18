'use client';

import { useEffect, useRef } from 'react';
import type { UserPreferences } from '@midnite/shared';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/app/theme/theme-context';
import { useLocalStorage } from '@/lib/use-local-storage';
import { getPreferences, putPreferences } from '@/lib/api';
import {
  appSettingsToPreferences,
  applyPreferences,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';

/** Debounce window before a local change is pushed to the server. */
const WRITE_DEBOUNCE_MS = 800;

/**
 * A stable, key-ordered serialization of a preferences blob, used to detect real
 * changes and to suppress the echo of a just-hydrated server value (whose
 * re-assembled key matches what we recorded as last-sent). Features are sorted so
 * map insertion order can't produce a spurious diff.
 */
function prefsKey(p: UserPreferences): string {
  return JSON.stringify({
    theme: p.theme,
    navMode: p.navMode,
    backgroundPattern: p.backgroundPattern,
    bgIntensity: p.bgIntensity,
    accent: p.accent,
    motion: p.motion,
    density: p.density,
    uiFont: p.uiFont,
    effects: { glass: p.effects.glass, pageReveal: p.effects.pageReveal, typewriter: p.effects.typewriter },
    inactivityTimeoutS: p.inactivityTimeoutS,
    cycleDurationS: p.cycleDurationS,
    updateChannel: p.updateChannel,
    features: Object.fromEntries(Object.keys(p.features).sort().map((k) => [k, p.features[k]])),
    seenGuides: Object.fromEntries(Object.keys(p.seenGuides).sort().map((k) => [k, p.seenGuides[k]])),
    autoShowGuides: p.autoShowGuides,
  });
}

/**
 * Mount-once bridge that syncs the user's preferences with the gateway (Phase 43
 * Theme C). Active **only when signed in** (JWT enabled + a current user); inert
 * otherwise, so single-user/local stays localStorage-only exactly as before.
 *
 * On login it hydrates from `GET /users/me/preferences` (server wins), seeding the
 * server from local on first sync when the row is empty so nothing is lost. After
 * that it debounce-writes every local change back via `PUT` (last-write-wins).
 * Renders nothing; lives in the `(main)` layout like `<LiveData/>`.
 */
export function PreferenceSync(): null {
  const { user, jwtEnabled } = useAuth();
  const active = jwtEnabled && !!user;

  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );
  const { preference, setPreference } = useTheme();

  const prefs = appSettingsToPreferences(settings, preference);
  const key = prefsKey(prefs);

  // Which user's preferences we've already hydrated, so login (not every render)
  // triggers a load; the last key we've persisted, so we don't echo it back.
  const loadedForUser = useRef<string | null>(null);
  const lastSent = useRef<string | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when the auth identity changes (logout / switch user).
  useEffect(() => {
    if (!active) {
      loadedForUser.current = null;
      lastSent.current = null;
    }
  }, [active]);

  // Hydrate from the server on login.
  useEffect(() => {
    if (!active || !hydrated || !user) return;
    if (loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;

    let cancelled = false;
    const localAtLoad = appSettingsToPreferences(settings, preference);
    void (async () => {
      try {
        const res = await getPreferences();
        if (cancelled) return;
        if (res.updatedAt === null) {
          // Server has nothing yet — seed it from the local setup so it's not lost.
          lastSent.current = prefsKey(localAtLoad);
          await putPreferences(localAtLoad);
        } else {
          // Server wins on load; record its key so the resulting local change
          // doesn't bounce straight back as a write.
          lastSent.current = prefsKey(res.preferences);
          applyPreferences(res.preferences, setSettings, setPreference);
        }
      } catch {
        // Non-fatal: stay on the local cache; allow a retry on the next login.
        if (!cancelled) loadedForUser.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
    // `settings`/`preference` are read as a snapshot at load; we intentionally key
    // only on the auth+hydration gate so this fires once per login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hydrated, user?.id]);

  // Write local changes through to the server (debounced, last-write-wins).
  useEffect(() => {
    if (!active || !hydrated || !user || loadedForUser.current !== user.id) return;
    if (key === lastSent.current) return; // no real change (or the hydrate echo)

    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      lastSent.current = key;
      putPreferences(prefs).catch(() => {
        // Failed — let the next change retry.
        lastSent.current = null;
      });
    }, WRITE_DEBOUNCE_MS);

    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hydrated, user?.id, key]);

  return null;
}
