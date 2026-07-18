'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { isBelowFloor, isUpdateAvailable, type VersionManifest } from '@midnite/shared';

import { fetchVersionManifest, getCurrentVersion } from '@/lib/version';

/** How often (ms) to re-poll `version.json` for a newer build. */
export const VERSION_POLL_INTERVAL_MS = 5 * 60 * 1000;

export type VersionPollState = {
  /** The published manifest is a strictly newer build than this one. */
  available: boolean;
  /** This build is below the manifest's force-update floor. */
  belowFloor: boolean;
  /** The latest version string, once a manifest has been fetched. */
  latest: string | null;
  /** The full manifest, once fetched (for notes URL / channel later). */
  manifest: VersionManifest | null;
};

const IDLE: VersionPollState = {
  available: false,
  belowFloor: false,
  latest: null,
  manifest: null,
};

/**
 * Polls the published `version.json` and reports whether a newer build is
 * available. Checks on mount, on an interval (~5 min), on window focus, and
 * whenever `pollKey` changes (route navigation — the provider passes the
 * pathname). Fails soft: a network error or malformed manifest just leaves the
 * last state untouched, never throws or toasts.
 *
 * This is the version-manifest half of detection; the service-worker
 * waiting-worker signal is folded in by the provider.
 */
export function useVersionPoll(pollKey?: string): VersionPollState {
  const [state, setState] = useState<VersionPollState>(IDLE);
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const manifest = await fetchVersionManifest();
      const current = getCurrentVersion();
      setState({
        available: isUpdateAvailable(current, manifest.version),
        belowFloor: isBelowFloor(current, manifest.minSupported),
        latest: manifest.version,
        manifest,
      });
    } catch {
      // Offline / malformed / not-yet-published manifest — keep prior state.
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Check on mount + whenever the route (pollKey) changes.
  useEffect(() => {
    void check();
  }, [check, pollKey]);

  // Interval + window-focus re-checks.
  useEffect(() => {
    const interval = setInterval(() => void check(), VERSION_POLL_INTERVAL_MS);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [check]);

  return state;
}
