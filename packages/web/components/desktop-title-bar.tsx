'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WindowChromeBridge } from '@midnite/shared';
import { TitleBar } from '@midnite/shell';

import { cssRgbToHex } from '@/lib/css-color';
import { FEATURES } from '@/lib/features';
import { HeaderActions } from '@/components/header/header-actions';

/**
 * The wired desktop title bar (Phase 81 Theme D) — web's contents for the
 * shell's <TitleBar> chrome, mounted only inside the frameless Electron window
 * (the shell component renders nothing in a browser). Left→right: history
 * back/forward + the active surface's label, the centred search pill (a trigger
 * for the ⌘K command palette, not a search UI of its own), and the
 * header-actions cluster relocated in from its floating browser position.
 *
 * Also owns the theme→window seam: whenever the appearance runtime retints the
 * page (theme class / accent vars on <html>), the body's computed background is
 * pushed through `setBackgroundColor` so the native window backing (resize
 * flashes, rounded-corner backing) stays seamless with the UI.
 */

/** The Chromium Navigation API — typed locally; absent outside Electron/Chrome. */
type NavigationLike = {
  canGoBack: boolean;
  canGoForward: boolean;
  addEventListener: (type: 'currententrychange', listener: () => void) => void;
  removeEventListener: (type: 'currententrychange', listener: () => void) => void;
};

function getNavigation(): NavigationLike | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { navigation?: NavigationLike }).navigation ?? null;
}

/** Track history reachability via the Navigation API (Chromium-only, fine on desktop). */
function useHistoryState(): { canGoBack: boolean; canGoForward: boolean } {
  const [state, setState] = useState({ canGoBack: false, canGoForward: false });
  useEffect(() => {
    const navigation = getNavigation();
    if (!navigation) {
      // No Navigation API — leave both enabled rather than dead buttons.
      setState({ canGoBack: true, canGoForward: true });
      return undefined;
    }
    const sync = () =>
      setState({ canGoBack: navigation.canGoBack, canGoForward: navigation.canGoForward });
    sync();
    navigation.addEventListener('currententrychange', sync);
    return () => navigation.removeEventListener('currententrychange', sync);
  }, []);
  return state;
}

/** Keep the native window backing in sync with the app theme (see module doc). */
function useWindowBackgroundSync(windowChrome: WindowChromeBridge | null) {
  useEffect(() => {
    if (!windowChrome?.frameless || typeof document === 'undefined') return undefined;
    const sync = () => {
      const hex = cssRgbToHex(getComputedStyle(document.body).backgroundColor);
      if (hex) windowChrome.setBackgroundColor(hex);
    };
    sync();
    // The theme runtime flips a class / CSS vars on <html>; watch exactly that.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    return () => observer.disconnect();
  }, [windowChrome]);
}

export function DesktopTitleBar({ windowChrome }: { windowChrome: WindowChromeBridge | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const tNav = useTranslations('nav');
  const { canGoBack, canGoForward } = useHistoryState();
  useWindowBackgroundSync(windowChrome);

  // The active surface's label — the owning feature's (translated) nav label,
  // falling back to the app name on non-feature routes (settings, detail pages).
  const feature = FEATURES.find(
    (f) => pathname === f.href || pathname.startsWith(`${f.href}/`),
  );
  const title = feature ? tNav(`features.${feature.key}`) : 'midnite';

  return (
    <TitleBar
      windowChrome={windowChrome}
      left={
        <>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={!canGoBack}
            aria-label="Back"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => router.forward()}
            disabled={!canGoForward}
            aria-label="Forward"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <span className="ml-1 max-w-[12rem] truncate text-sm font-medium text-foreground/90">
            {title}
          </span>
        </>
      }
      center={
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('midnite:open-palette'))}
          aria-label="Search"
          className="flex h-7 w-full max-w-md items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/70 hover:text-foreground"
        >
          <Search aria-hidden className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Search midnite…</span>
          <kbd className="shrink-0 rounded border border-border/60 bg-background px-1 font-mono text-[10px] leading-4 text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      }
      right={<HeaderActions inline />}
    />
  );
}
