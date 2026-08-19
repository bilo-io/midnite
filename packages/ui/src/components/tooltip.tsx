'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';

type Placement = 'top' | 'bottom';

type TooltipProps = {
  /** The tooltip copy. Nothing renders when empty. */
  label: string;
  /** The trigger. Must accept a ref-bearing wrapper — it is wrapped in a span. */
  children: React.ReactNode;
  /** Preferred side; flips automatically when there isn't room. */
  placement?: Placement;
  /** Hover dwell before showing, in ms. Focus shows immediately. */
  delayMs?: number;
  className?: string;
};

/** Gap between the trigger and the bubble, in px. */
const OFFSET = 6;

/**
 * A hover/focus tooltip for icon-only controls.
 *
 * Rendered through a **portal with fixed positioning** — the repo's rule for
 * overflow-sensitive layers (dropdowns, popovers): an absolutely-positioned
 * bubble gets clipped by any scroll/overflow ancestor, and these triggers live
 * inside board accordion headers and toolbars that have them.
 *
 * The bubble is `aria-hidden` and carries no `aria-describedby`: icon buttons
 * already name themselves with `aria-label`, so exposing the same string again
 * would make screen readers announce it twice. This is a **visual** affordance
 * layered over an already-accessible control, not the accessible name itself.
 */
export function Tooltip({
  label,
  children,
  placement = 'top',
  delayMs = 250,
  className,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const bubbleRef = React.useRef<HTMLDivElement | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Clear a pending open on unmount so a timer can't fire after teardown.
  React.useEffect(() => clearTimer, [clearTimer]);

  const show = React.useCallback(
    (immediate: boolean) => {
      clearTimer();
      if (immediate) {
        setOpen(true);
        return;
      }
      timer.current = setTimeout(() => setOpen(true), delayMs);
    },
    [clearTimer, delayMs],
  );

  const hide = React.useCallback(() => {
    clearTimer();
    setOpen(false);
    setCoords(null);
  }, [clearTimer]);

  // Measure once open (after the bubble mounts, so its real height is known) and
  // flip to the other side when the preferred one would overflow the viewport.
  React.useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;
    const bubble = bubbleRef.current?.getBoundingClientRect();
    const height = bubble?.height ?? 0;
    const width = bubble?.width ?? 0;

    const fitsAbove = trigger.top - height - OFFSET >= 0;
    const side: Placement = placement === 'top' ? (fitsAbove ? 'top' : 'bottom') : 'bottom';
    const top =
      side === 'top' ? trigger.top - height - OFFSET : trigger.bottom + OFFSET;

    // Centre on the trigger, then clamp so the bubble never leaves the viewport.
    const centred = trigger.left + trigger.width / 2 - width / 2;
    const left = Math.max(8, Math.min(centred, window.innerWidth - width - 8));
    setCoords({ top, left });
  }, [open, placement, label]);

  // A scroll or resize invalidates the measured position — close rather than
  // chase it, matching how the app's other transient layers behave.
  React.useEffect(() => {
    if (!open) return;
    const onDismiss = () => hide();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, hide]);

  return (
    <>
      <span
        ref={triggerRef}
        className="contents"
        onPointerEnter={() => show(false)}
        onPointerLeave={hide}
        onFocusCapture={() => show(true)}
        onBlurCapture={hide}
      >
        {children}
      </span>
      {open && label && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={bubbleRef}
              role="tooltip"
              aria-hidden
              className={cn(
                'pointer-events-none fixed z-[200] max-w-xs rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md',
                // Measured on the first paint — keep it invisible until then so it
                // never flashes at the top-left corner.
                coords ? 'opacity-100' : 'opacity-0',
                className,
              )}
              style={{ top: coords?.top ?? 0, left: coords?.left ?? 0 }}
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
