'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// How far the user must drag (in px) before we trigger the reload.
const TRIGGER_PX = 80;
// Maximum visual drag distance — resist further than this.
const MAX_PX = 110;

/**
 * Pull-to-refresh for the installed PWA on iOS (and any touch browser).
 *
 * iOS disables the native browser pull-to-refresh when the app is saved to the
 * Home Screen, so users have no way to force a fresh load. This component
 * re-implements the gesture and calls `window.location.reload()` on release,
 * which goes through the service worker's network-first strategy and bypasses
 * the iOS BFCache (page-snapshot restore) that otherwise serves stale UI.
 *
 * Only activates at scroll position 0 so it never fights normal page scrolling.
 * Uses a non-passive touchmove listener so it can call preventDefault() while
 * the drag is live, suppressing the OS-level overscroll bounce.
 */
export function PullToRefresh() {
  const [pullPx, setPullPx] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const startY = useRef<number | null>(null);
  const livePull = useRef(0); // mutable mirror so touchend sees the latest value

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      const touch = e.touches[0];
      if (!touch) return;
      startY.current = touch.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      // If the user scrolled down since touchstart, abandon the gesture.
      if (window.scrollY > 0) {
        startY.current = null;
        livePull.current = 0;
        setPullPx(0);
        return;
      }
      const touch = e.touches[0];
      if (!touch) return;
      const dy = touch.clientY - startY.current;
      if (dy <= 0) {
        livePull.current = 0;
        setPullPx(0);
        return;
      }
      // Resist the drag with sqrt so the indicator moves quickly at first then
      // slows near MAX_PX, matching the iOS native feel.
      const px = Math.min(Math.sqrt(dy) * Math.sqrt(MAX_PX), MAX_PX);
      livePull.current = px;
      setPullPx(px);
      // Suppress the OS overscroll bounce while we own the gesture.
      e.preventDefault();
    };

    const onTouchEnd = () => {
      if (livePull.current >= TRIGGER_PX) {
        setTriggered(true);
        window.location.reload();
      } else {
        livePull.current = 0;
        setPullPx(0);
      }
      startY.current = null;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    // Non-passive so we can preventDefault() during an active pull.
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  if (pullPx === 0 && !triggered) return null;

  const progress = Math.min(pullPx / TRIGGER_PX, 1);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex items-end justify-center"
      style={{
        height: `${pullPx}px`,
        // Snap back smoothly when the finger lifts without triggering.
        transition: startY.current === null && !triggered ? 'height 300ms ease-out' : undefined,
      }}
    >
      <RefreshCw
        aria-hidden
        className={cn(
          'mb-2 h-5 w-5 text-muted-foreground',
          triggered ? 'animate-spin' : 'transition-[opacity,transform] duration-100',
        )}
        style={
          triggered
            ? undefined
            : {
                opacity: progress,
                transform: `rotate(${progress * 270}deg) scale(${0.6 + progress * 0.4})`,
              }
        }
      />
    </div>
  );
}
