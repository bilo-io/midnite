'use client';

import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_WORDMARK_FONT,
  WORDMARK_FONT_STORAGE_KEY,
  wordmarkFontVar,
} from '@/lib/wordmark-fonts';

// The "midnite" wordmark, rendered in whichever trial font is currently selected
// on /branding. Backed by localStorage and synced live across the tab, so picking
// a font there updates every wordmark instance at once. Defaults to SignPainter.
export function Wordmark({ className }: { className?: string }) {
  const [font] = useLocalStorage<string>(WORDMARK_FONT_STORAGE_KEY, DEFAULT_WORDMARK_FONT);
  return (
    <span
      className={cn('text-sm font-semibold', className)}
      style={{ fontFamily: `var(${wordmarkFontVar(font)})` }}
    >
      midnite
    </span>
  );
}
