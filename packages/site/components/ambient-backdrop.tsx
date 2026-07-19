'use client';

import { useEffect, useState } from 'react';
import { NeuroCloudBackground } from '@midnite/ui';

/**
 * The site's ambient backdrop: the shared neuro-cloud starfield — the same canvas
 * the app and docs render — so every midnite surface wears one signature
 * background. Fixed + `pointer-events-none`, behind page content (content is
 * `relative z-10`). It reads the site's `--foreground` / `--node-*` tokens, so it
 * re-tints with the active theme; a bottom fade keeps text legible. Animates
 * unless the visitor prefers reduced motion (the canvas owns no motion gating).
 */
export function AmbientBackdrop() {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAnimate(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <NeuroCloudBackground animate={animate} />
      {/* Fade into the page background at the bottom for legibility. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}
