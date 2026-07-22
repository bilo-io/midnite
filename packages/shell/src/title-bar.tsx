'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { WindowChromeBridge } from '@midnite/shared';
import { cn } from '@midnite/ui';

/**
 * The desktop title bar (Phase 81) — the app-drawn chrome that replaces the
 * native macOS title bar when the Electron window is frameless. Renders nothing
 * unless a `WindowChromeBridge` with `frameless: true` is provided, so a browser
 * host (or a non-mac desktop, which keeps its native frame) is untouched.
 *
 * Structure only — like `AppFrame`'s injected nav, the *contents* (search pill,
 * history arrows, the header-actions cluster) are the host's to mount via the
 * `left`/`center`/`right` slots. The bar owns the window-chrome behaviours:
 *
 * - the whole strip is a drag region (`-webkit-app-region: drag`); each slot is
 *   wrapped in `no-drag` so its interactive children stay clickable
 * - left clearance for the inset traffic lights, collapsing while fullscreen
 *   (macOS hides the lights there) via the bridge's `onFullscreenChange` — CSS
 *   `env(titlebar-area-*)` is not populated on mac, the bridge event is the
 *   source of truth
 * - dims while the window is blurred (`onFocusChange`), like a native bar
 * - publishes its height as `--titlebar-h` on the root element so the fixed nav
 *   rail and the in-flow app column offset below it (mirrors `--update-banner-h`)
 */
export type TitleBarProps = {
  /** The desktop window-chrome bridge; absent/framed → the bar renders nothing. */
  windowChrome: WindowChromeBridge | null | undefined;
  /** Left slot (history back/forward, page title) — rendered `no-drag`. */
  left?: ReactNode;
  /** Centered slot (the search pill) — rendered `no-drag`. */
  center?: ReactNode;
  /** Right slot (the header-actions cluster) — rendered `no-drag`. */
  right?: ReactNode;
  className?: string;
};

/**
 * Bar height (48px) — also published as `--titlebar-h` while mounted. Tall
 * enough that a 36px control's focus ring isn't clipped against the bar edge.
 * web's collapsed sticky page header holds the SAME height (48px, stuck at
 * -1px) so it hides exactly behind the bar and sticky toolbars below it share
 * one `top-12` offset — keep the two in lockstep.
 */
export const TITLE_BAR_HEIGHT = '3rem';

// `-webkit-app-region` isn't in React's CSSProperties; the casts keep strict TS.
const DRAG_STYLE = { WebkitAppRegion: 'drag' } as CSSProperties;
const NO_DRAG_STYLE = { WebkitAppRegion: 'no-drag' } as CSSProperties;

export function TitleBar({ windowChrome, left, center, right, className }: TitleBarProps) {
  const frameless = windowChrome?.frameless === true;
  const [fullscreen, setFullscreen] = useState(false);
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    if (!frameless || !windowChrome) return undefined;
    const offFullscreen = windowChrome.onFullscreenChange(setFullscreen);
    const offFocus = windowChrome.onFocusChange(setFocused);
    return () => {
      offFullscreen();
      offFocus();
    };
  }, [frameless, windowChrome]);

  // Publish the bar height so the rest of the chrome offsets below it: the
  // shell rail tops at `calc(--update-banner-h + --titlebar-h)` and the app
  // column pads by it. Defaults to 0px everywhere the bar doesn't mount.
  useEffect(() => {
    if (!frameless || typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    root.style.setProperty('--titlebar-h', TITLE_BAR_HEIGHT);
    return () => {
      root.style.setProperty('--titlebar-h', '0px');
    };
  }, [frameless]);

  if (!frameless) return null;

  const clearTrafficLights = windowChrome.platform === 'darwin' && !fullscreen;

  return (
    <header
      aria-label="Window title bar"
      data-window-focused={focused ? 'true' : 'false'}
      style={DRAG_STYLE}
      className={cn(
        'fixed inset-x-0 top-0 z-[60] flex h-12 items-center gap-3 border-b border-border/60 bg-background pr-3 transition-[padding-left,opacity] duration-200',
        // 5.25rem clears the traffic lights inset at { x: 16, y: 18 }.
        clearTrafficLights ? 'pl-[5.25rem]' : 'pl-3',
        !focused && 'opacity-60',
        className,
      )}
    >
      {left ? (
        <div style={NO_DRAG_STYLE} className="flex shrink-0 items-center gap-1">
          {left}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center justify-center">
        {center ? (
          // The no-drag region must hug the visible search box. `w-full max-w-xl`
          // stretched it ~36rem wide — far past the box — so the empty flanks
          // became a no-drag dead zone that swallowed window-drag on the bar.
          // Cap at 20rem so the draggable strip resumes right beside the box.
          <div style={NO_DRAG_STYLE} className="flex w-full max-w-xs items-center justify-center">
            {center}
          </div>
        ) : null}
      </div>
      {right ? (
        <div style={NO_DRAG_STYLE} className="flex shrink-0 items-center gap-1.5">
          {right}
        </div>
      ) : null}
    </header>
  );
}

/**
 * A bare top drag strip for full-viewport overlays and chrome-less pages (the
 * lock screen, the auth split-screen) — keeps the frameless window draggable
 * where the <TitleBar> itself doesn't mount. Renders nothing when framed.
 */
export function TitleBarDragStrip({
  windowChrome,
  className,
}: {
  windowChrome: WindowChromeBridge | null | undefined;
  className?: string;
}) {
  if (windowChrome?.frameless !== true) return null;
  return (
    <div aria-hidden style={DRAG_STYLE} className={cn('fixed inset-x-0 top-0 z-[70] h-12', className)} />
  );
}
