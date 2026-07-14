'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { getSetupStatus } from '@/lib/api';
import { resolveGuide } from '@/lib/guide/steps';
import { useGuide } from '@/lib/guide/use-guide';
import { useSeenGuides } from '@/lib/guide/use-seen-guides';
import { useApiData } from '@/lib/use-api-data';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsDesktop } from '@/hooks/use-media-query';

/**
 * Auto-launches the current route's product guide **once** when an unseen guide
 * first resolves for the landing (Phase 67 A). Renders nothing — a thin effect
 * component mounted in the `(main)` shell so `layout.tsx` stays declarative and
 * the gating logic is unit-testable in isolation.
 *
 * Guardrails (Decision §2): auto-launch only fires when
 * - the viewport is **desktop** (`useIsDesktop`) — never nag a scrolling mobile user;
 * - the install is **past first-run setup** (`SetupStatus.ready`) — so it can't
 *   collide with the Phase 19 wizard/nudge, which own the first-run window;
 * - the **`autoShowGuides`** preference is on (default true).
 *
 * It never interrupts a guide already running, and marking-seen (done by the
 * overlay on start) keeps it quiet afterwards. Manual replay from the assistant
 * menu is unaffected by any of this.
 */
export function GuideAutoLaunch(): null {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const { hasSeen } = useSeenGuides();
  const start = useGuide((s) => s.start);
  const active = useGuide((s) => s.active);
  const { data: setup } = useApiData(() => getSetupStatus());

  // Pathnames we've already auto-launched this session, so a re-render (or a
  // return visit within the session) never re-triggers on the same route.
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!pathname) return;
    if (!isDesktop || !settings.autoShowGuides || setup?.ready !== true) return;
    // Don't clobber a guide the user is already running.
    if (active) return;
    if (handled.current.has(pathname)) return;

    const guide = resolveGuide(pathname);
    if (!guide || hasSeen(guide)) return;

    handled.current.add(pathname);
    start(guide);
  }, [pathname, isDesktop, settings.autoShowGuides, setup?.ready, active, hasSeen, start]);

  return null;
}
