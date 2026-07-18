import { cn } from '@/lib/utils';
import { WORDMARK_LOGO_FONT, wordmarkFontVar } from '@/lib/wordmark-fonts';

// The "midnite" wordmark, hard-coded to the Cassandra face (WORDMARK_LOGO_FONT)
// everywhere it renders as the logo.
//
// Pass `font` to pin a different font (e.g. the quote-widget's per-widget font
// picker preview cards) instead of the logo default.
// The standalone (sidenav) size is `text-xl`, with optical nudges: Cannet Agency —
// a heavy, wide face that already reads large — keeps the compact `text-sm`, while
// SignPainter and Quantum Sector render small for their point size, so they bump up
// to `text-2xl`. Pickers override these with their own `text-*` (tailwind-merge
// keeps the caller's size).
// `text` overrides the rendered string — the auth intro types the wordmark out
// character by character; everything else renders the full default.
export function Wordmark({
  font,
  className,
  text = 'midnite',
}: {
  font?: string;
  className?: string;
  text?: string;
}) {
  const active = font ?? WORDMARK_LOGO_FONT;
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
      {text}
    </span>
  );
}
