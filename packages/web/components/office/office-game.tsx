'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/app/theme/theme-context';
import { applyOfficeTheme, createOfficeGame } from './scenes/office-scene';
import { applyCornerOfficeTheme } from './scenes/corner-office-scene';

type Game = ReturnType<typeof createOfficeGame>;

/**
 * Mounts the Phaser game into a div and tears it down on unmount.
 *
 * Creation is deferred one tick so React StrictMode's dev-only
 * mount→unmount→mount collapses to a single game: the first scheduled create is
 * cancelled by the cleanup before it runs, so we never briefly have two Phaser
 * canvases/scenes. (Two scenes left a destroyed scene's store subscription
 * firing renderOccupants into dead GameObjects — the "drawImage of null" crash.)
 * Only ever runs client-side, via the ssr:false wrapper in office-view.
 */
export function OfficeGame() {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled || gameRef.current || !parentRef.current) return;
      gameRef.current = createOfficeGame(parentRef.current);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Re-tint whichever scene is active when the app theme flips.
  useEffect(() => {
    if (!gameRef.current) return;
    applyOfficeTheme(gameRef.current);
    applyCornerOfficeTheme(gameRef.current);
  }, [resolved]);

  return <div ref={parentRef} className="absolute inset-0" />;
}
