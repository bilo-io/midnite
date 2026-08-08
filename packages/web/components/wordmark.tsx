'use client';

import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  WORDMARK_LOGO_FONT,
  WORDMARK_FONT_STORAGE_KEY,
  WORDMARK_CASE_STORAGE_KEY,
  WORDMARK_SIZE_STORAGE_KEY,
  DEFAULT_WORDMARK_CASE,
  DEFAULT_WORDMARK_SIZE,
  applyWordmarkCase,
  wordmarkFontVar,
  wordmarkSizeClass,
  type WordmarkCase,
  type WordmarkSize,
  WORDMARK_TEXT,
} from '@/lib/wordmark-fonts';

// The "Midnite" wordmark, following the live per-user trial selection made in
// Settings → Appearance → Logo: the font (`midnite.wordmark-font.v2`, defaulting
// to Quick Kiss), the letter-casing (`midnite.wordmark-case.v2`, defaulting to
// title case) and the size (`midnite.wordmark-size.v2`, defaulting to 'xl'). All
// are localStorage-backed and broadcast, so picking any there updates every
// wordmark instance at once. That picker is currently commented out, so in
// practice these read as the constants above — the wiring stays so uncommenting
// it restores the live trial behaviour.
//
// Pass `font` to pin a specific face (e.g. the picker preview cards / the
// quote-widget's per-widget picker) instead of following the stored selection.
// The base size comes from `wordmarkSizeClass` — the stored size stepped by a
// per-font optical nudge (Cannet Agency reads large, SignPainter and Quantum
// Sector small). Pickers override it with their own `text-*` (tailwind-merge
// keeps the caller's size).
// `text` overrides the rendered string verbatim (no casing transform) — the auth
// intro types the wordmark out character by character; everything else renders the
// full "Midnite" default in the stored casing.
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
  const [storedSize] = useLocalStorage<WordmarkSize>(
    WORDMARK_SIZE_STORAGE_KEY,
    DEFAULT_WORDMARK_SIZE,
  );
  const active = font ?? storedFont;
  const label = text ?? applyWordmarkCase(WORDMARK_TEXT, storedCase);
  return (
    <span
      className={cn(wordmarkSizeClass(storedSize, active), 'font-semibold', className)}
      style={{ fontFamily: `var(${wordmarkFontVar(active)})` }}
    >
      {label}
    </span>
  );
}
