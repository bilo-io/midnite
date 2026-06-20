'use client';

import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_WORDMARK_FONT,
  WORDMARK_FONT_STORAGE_KEY,
  wordmarkFontVar,
} from '@/lib/wordmark-fonts';

// The "midnite" wordmark, rendered in whichever trial font is currently selected
// in Settings → Appearance → Logo. Backed by localStorage and synced live across
// the tab, so picking a font there updates every wordmark instance at once.
// Defaults to SignPainter.
//
// Pass `font` to pin a specific font (e.g. the font-picker preview cards) instead
// of following the stored selection — every instance then shares this one styling.
// The standalone (sidenav) size is `text-xl`, with optical nudges: Cannet Agency —
// a heavy, wide face that already reads large — keeps the compact `text-sm`, while
// SignPainter and Quantum Sector render small for their point size, so they bump up
// to `text-2xl`. Pickers override these with their own `text-*` (tailwind-merge
// keeps the caller's size).
export function Wordmark({ font, className }: { font?: string; className?: string }) {
  const [stored] = useLocalStorage<string>(WORDMARK_FONT_STORAGE_KEY, DEFAULT_WORDMARK_FONT);
  const active = font ?? stored;
  const baseSize =
    active === 'cannet'
      ? 'text-sm'
      : active === 'signpainter' || active === 'quantum-sector'
        ? 'text-2xl'
        : 'text-xl';
  return (
    <span
      className={cn(baseSize, 'font-semibold', className)}
      style={{ fontFamily: `var(${wordmarkFontVar(active)})` }}
    >
      midnite
    </span>
  );
}
