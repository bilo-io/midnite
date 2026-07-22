'use client';

import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  WORDMARK_LOGO_FONT,
  WORDMARK_FONT_STORAGE_KEY,
  WORDMARK_CASE_STORAGE_KEY,
  DEFAULT_WORDMARK_CASE,
  applyWordmarkCase,
  wordmarkFontVar,
  type WordmarkCase,
} from '@/lib/wordmark-fonts';

// The "midnite" wordmark, following the live per-user trial selection made in
// Settings → Appearance → Logo: the font (`midnite.wordmark-font`, defaulting to
// Cassandra) and the letter-casing (`midnite.wordmark-case`, defaulting to
// lowercase). Both are localStorage-backed and broadcast, so picking either there
// updates every wordmark instance at once.
//
// Pass `font` to pin a specific face (e.g. the picker preview cards / the
// quote-widget's per-widget picker) instead of following the stored selection.
// The standalone (sidenav) size is `text-xl`, with optical nudges: Cannet Agency —
// a heavy, wide face that already reads large — keeps the compact `text-sm`, while
// SignPainter and Quantum Sector render small for their point size, so they bump up
// to `text-2xl`. Pickers override these with their own `text-*` (tailwind-merge
// keeps the caller's size).
// `text` overrides the rendered string verbatim (no casing transform) — the auth
// intro types the wordmark out character by character; everything else renders the
// full "midnite" default in the stored casing.
export function Wordmark({
  font,
  className,
  text,
}: {
  font?: string;
  className?: string;
  text?: string;
}) {
  const [storedFont] = useLocalStorage<string>(WORDMARK_FONT_STORAGE_KEY, WORDMARK_LOGO_FONT);
  const [storedCase] = useLocalStorage<WordmarkCase>(
    WORDMARK_CASE_STORAGE_KEY,
    DEFAULT_WORDMARK_CASE,
  );
  const active = font ?? storedFont;
  const label = text ?? applyWordmarkCase('midnite', storedCase);
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
      {label}
    </span>
  );
}
