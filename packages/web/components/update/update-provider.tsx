'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

import type { VersionManifest } from '@midnite/shared';

import { useVersionPoll } from '@/hooks/use-version-poll';
import {
  getUpdatesBridge,
  type UpdatePhase,
  type UpdateState,
  type UpdatesBridge,
} from '@/lib/desktop-bridge';
import {
  applyUpdate as applyServiceWorkerUpdate,
  checkForWaitingWorker,
  watchWaitingWorker,
} from '@/lib/service-worker-update';

export type UpdateContextValue = {
  /** A newer build is available (version.json poll / waiting SW / desktop feed). */
  available: boolean;
  /** This build is below the force-update floor — the banner can't be dismissed. */
  belowFloor: boolean;
  /** Latest version string, once known. */
  latest: string | null;
  /** Full manifest, once fetched (release notes / channel). Web only. */
  manifest: VersionManifest | null;
  /** Banner is currently dismissed for this view (reset on navigation/reload). */
  dismissed: boolean;
  /** Running inside the Electron shell (desktop electron-updater path). */
  isDesktop: boolean;
  /** Desktop updater phase, or null in a plain browser. */
  desktopPhase: UpdatePhase | null;
  /** Download progress 0–100 while the desktop update is downloading, else null. */
  downloadPercent: number | null;
  /** The desktop update failed — the banner can offer a retry. */
  errored: boolean;
  /** Hide the banner for the current view (ephemeral — never persisted). */
  dismiss: () => void;
  /** Take the update: web → SW handoff/reload; desktop → download→restart. */
  applyUpdate: () => void;
};

const UpdateContext = createContext<UpdateContextValue | null>(null);

/**
 * Owns update-available state for the whole app (Phase 71). In a plain browser it
 * composes the version.json poll with the service-worker waiting signal. Inside the
 * Electron shell it instead subscribes to the electron-updater feed (Theme E) —
 * that feed is authoritative on desktop, so the web poll is ignored there (one
 * source of truth, no double-detection). Holds the ephemeral per-view dismissed
 * flag (reset on route change) either way.
 */
export function UpdateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const poll = useVersionPoll(pathname ?? undefined);
  const [swWaiting, setSwWaiting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [bridge, setBridge] = useState<UpdatesBridge | null>(null);
  const [desktop, setDesktop] = useState<UpdateState | null>(null);

  // Detect the desktop updater bridge once; subscribe to its state and kick an
  // initial check (the main process also checks on boot — checkForUpdates is
  // idempotent). Absent in a plain browser → the poll/SW path below drives things.
  useEffect(() => {
    const found = getUpdatesBridge();
    if (!found) return undefined;
    setBridge(found);
    const off = found.onState(setDesktop);
    found.check();
    return off;
  }, []);

  // Watch the service worker for a waiting (installed-but-not-active) update.
  useEffect(() => watchWaitingWorker(() => setSwWaiting(true)), []);

  // Nudge both detectors on navigation (mirrors the poll's per-route re-check).
  useEffect(() => {
    void checkForWaitingWorker();
    bridge?.check();
  }, [pathname, bridge]);

  // A new route is a fresh view: an update the user dismissed should reappear.
  useEffect(() => {
    setDismissed(false);
  }, [pathname]);

  const isDesktop = bridge !== null;
  const desktopPhase: UpdatePhase | null = isDesktop ? desktop?.phase ?? 'idle' : null;
  // Keep the banner up for an error only once an update was actually known (a
  // version was seen) — so a *download* failure surfaces "Update failed / Retry",
  // but a boot-time unreachable-feed error (no version yet) stays fail-soft/hidden.
  const desktopActive =
    desktopPhase === 'available' ||
    desktopPhase === 'downloading' ||
    desktopPhase === 'downloaded' ||
    (desktopPhase === 'error' && desktop?.version != null);

  // On desktop the electron-updater feed is authoritative; the web poll + SW
  // signal only drive the banner in a plain browser.
  const available = isDesktop ? desktopActive : poll.available || swWaiting;
  const latest = isDesktop ? desktop?.version ?? null : poll.latest;

  const applyUpdate = useCallback(() => {
    if (bridge) {
      const phase = desktop?.phase;
      if (phase === 'downloaded') bridge.restartToInstall();
      else if (phase === 'error') bridge.check();
      else bridge.download();
      return;
    }
    void applyServiceWorkerUpdate();
  }, [bridge, desktop?.phase]);

  const value = useMemo<UpdateContextValue>(
    () => ({
      available,
      // The force-update floor is a web-manifest concept; desktop has no floor yet.
      belowFloor: isDesktop ? false : poll.belowFloor,
      latest,
      manifest: isDesktop ? null : poll.manifest,
      dismissed,
      isDesktop,
      desktopPhase,
      downloadPercent: desktop?.phase === 'downloading' ? desktop.percent : null,
      errored: desktop?.phase === 'error',
      dismiss: () => setDismissed(true),
      applyUpdate,
    }),
    [
      available,
      isDesktop,
      poll.belowFloor,
      poll.manifest,
      latest,
      dismissed,
      desktopPhase,
      desktop,
      applyUpdate,
    ],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

/** Read update-available state. Throws if used outside <UpdateProvider>. */
export function useUpdate(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error('useUpdate must be used within an UpdateProvider');
  return ctx;
}
