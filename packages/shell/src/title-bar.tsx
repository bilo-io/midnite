'use client';

import { useCallback, useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
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
 * - double-click-to-zoom on the drag region (`toggleMaximize`) — macOS applies
 *   the gesture to *native* title bars only, so a frameless window has to drive
 *   it itself; clicks landing on a `no-drag` slot are ignored, matching native
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
  /**
   * Accessible name for the bar's `<header>` landmark (shell is catalog-free —
   * a host passes a t()-derived value). Defaults to the English string.
   */
  label?: string;
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

/**
 * Marks the `no-drag` slot wrappers. `onDoubleClick` bubbles up from whatever the
 * user actually hit, so the zoom guard uses this to ignore double-clicks on the
 * bar's interactive children (a double-click on the search pill must not zoom the
 * window) — the same split `-webkit-app-region` already draws for dragging.
 */
const NO_DRAG_MARKER = 'data-titlebar-no-drag';
const NO_DRAG_SLOT_PROPS = { [NO_DRAG_MARKER]: '', style: NO_DRAG_STYLE } as const;

export function TitleBar({
  windowChrome,
  left,
  center,
  right,
  label = 'Window title bar',
  className,
}: TitleBarProps) {
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

  // Double-click-to-zoom. Only fires for clicks that landed on the drag surface
  // itself — a double-click inside a `no-drag` slot (the search pill, a header
  // action) is the child's, exactly as with a native bar.
  const onDoubleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const target = event.target;
      // React events bubble the *React* tree, not the DOM one, so a slot child
      // that renders through a portal still reaches this handler while its DOM
      // ancestors are `document.body`. The `no-drag` lookup below can't see that,
      // so the containment test comes first: only a real DOM descendant of the bar
      // is a double-click *on the bar*. Without it, double-clicking a word in the
      // project filter's search field (a portalled dropdown, as every overflow
      // menu in web must be) would zoom the window mid-interaction.
      if (!(target instanceof Node) || !event.currentTarget.contains(target)) return;
      if (target instanceof Element && target.closest(`[${NO_DRAG_MARKER}]`)) return;
      windowChrome?.toggleMaximize?.();
    },
    [windowChrome],
  );

  if (!frameless) return null;

  const clearTrafficLights = windowChrome.platform === 'darwin' && !fullscreen;

  return (
    <header
      aria-label={label}
      data-window-focused={focused ? 'true' : 'false'}
      onDoubleClick={onDoubleClick}
      style={DRAG_STYLE}
      className={cn(
        'fixed inset-x-0 top-0 z-[60] flex h-12 items-center justify-between gap-3 border-b border-border/60 bg-background pr-3 transition-[padding-left,opacity] duration-200',
        // 5.25rem clears the traffic lights inset at { x: 16, y: 18 }.
        clearTrafficLights ? 'pl-[5.25rem]' : 'pl-3',
        !focused && 'opacity-60',
        className,
      )}
    >
      {left ? (
        // Yields width below `md` (see the `center` note) so the page title
        // truncates instead of running under the search pill; immovable from
        // `md` up, where there is room for all three slots.
        <div {...NO_DRAG_SLOT_PROPS} className="flex min-w-0 items-center gap-1 md:shrink-0">
          {left}
        </div>
      ) : null}
      {center ? (
        // From `md` up: centered on the FULL bar width (not the space left over
        // between the left/right slots) via absolute positioning, so a growing
        // right slot (e.g. the connection pill revealing its label) never shifts
        // or shrinks this box — it used to, back when this was a `flex-1` spacer
        // shared with `right`. Fixed width (not flex-1) per the same reasoning: a
        // stable, narrower box reads as a search *trigger*, not a search field
        // competing for the bar's width.
        //
        // Below `md` that absolute box was wider than the room actually left over
        // — a narrow window put it straight on top of the left slot's page title
        // (bilo-io/midnite-app#5). There it goes back in flow as a flex child, so
        // the three slots share the row and the title truncates; the pill keeps an
        // 8rem floor so it stays a legible trigger rather than collapsing.
        <div
          {...NO_DRAG_SLOT_PROPS}
          className="flex min-w-[8rem] flex-1 items-center justify-center md:absolute md:inset-y-0 md:left-1/2 md:w-[30%] md:min-w-[14rem] md:max-w-sm md:flex-none md:-translate-x-1/2"
        >
          {center}
        </div>
      ) : null}
      {right ? (
        <div {...NO_DRAG_SLOT_PROPS} className="flex min-w-0 shrink-0 items-center gap-1.5">
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
 *
 * It has no children, so double-click-to-zoom needs no `no-drag` guard here: the
 * whole strip is drag surface.
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
    <div
      aria-hidden
      onDoubleClick={() => windowChrome.toggleMaximize?.()}
      style={DRAG_STYLE}
      className={cn('fixed inset-x-0 top-0 z-[70] h-12', className)}
    />
  );
}
