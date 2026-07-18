'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import type { VersionManifest } from '@midnite/shared';

import { useVersionPoll } from '@/hooks/use-version-poll';
import {
  applyUpdate as applyServiceWorkerUpdate,
  checkForWaitingWorker,
  watchWaitingWorker,
} from '@/lib/service-worker-update';

export type UpdateContextValue = {
  /** A newer build is available (version.json poll OR a waiting service worker). */
  available: boolean;
  /** This build is below the force-update floor — the banner can't be dismissed. */
  belowFloor: boolean;
  /** Latest version string, once known. */
  latest: string | null;
  /** Full manifest, once fetched (release notes / channel). */
  manifest: VersionManifest | null;
  /** Banner is currently dismissed for this view (reset on navigation/reload). */
  dismissed: boolean;
  /** Hide the banner for the current view (ephemeral — never persisted). */
  dismiss: () => void;
  /** Take the update live (SW handoff → reload, else hard reload). */
  applyUpdate: () => void;
};

const UpdateContext = createContext<UpdateContextValue | null>(null);

/**
 * Owns update-available state for the whole app (Phase 71). Composes the
 * version.json poll with the service-worker waiting signal, and holds the
 * ephemeral per-view dismissed flag (reset whenever the route changes, so a
 * dismissed banner re-surfaces on navigation while an update is still pending).
 */
export function UpdateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const poll = useVersionPoll(pathname ?? undefined);
  const [swWaiting, setSwWaiting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Watch the service worker for a waiting (installed-but-not-active) update.
  useEffect(() => watchWaitingWorker(() => setSwWaiting(true)), []);

  // Nudge the browser to look for a new SW on navigation (mirrors the poll).
  useEffect(() => {
    void checkForWaitingWorker();
  }, [pathname]);

  // A new route is a fresh view: an update the user dismissed should reappear.
  useEffect(() => {
    setDismissed(false);
  }, [pathname]);

  const available = poll.available || swWaiting;

  const value = useMemo<UpdateContextValue>(
    () => ({
      available,
      belowFloor: poll.belowFloor,
      latest: poll.latest,
      manifest: poll.manifest,
      dismissed,
      dismiss: () => setDismissed(true),
      applyUpdate: () => void applyServiceWorkerUpdate(),
    }),
    [available, poll.belowFloor, poll.latest, poll.manifest, dismissed],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

/** Read update-available state. Throws if used outside <UpdateProvider>. */
export function useUpdate(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error('useUpdate must be used within an UpdateProvider');
  return ctx;
}
