'use client';

import { useEffect, useRef } from 'react';
import { createOfficeGame } from './scenes/office-scene';

type Game = ReturnType<typeof createOfficeGame>;

/**
 * Mounts the Phaser game into a div and tears it down on unmount. The guard +
 * destroy(true) keep this safe under React StrictMode's double-invoke in dev
 * (reactStrictMode is on), and out of the server graph (it only ever runs in an
 * effect, and is itself only reached via the ssr:false wrapper in office-view).
 */
export function OfficeGame() {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (gameRef.current || !parentRef.current) return;
    gameRef.current = createOfficeGame(parentRef.current);
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={parentRef} className="absolute inset-0" />;
}
