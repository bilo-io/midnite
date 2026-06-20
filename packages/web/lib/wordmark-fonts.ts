// The "midnite" wordmark can be rendered in any of these trial fonts. Each entry
// maps a stable key (persisted in localStorage) to a human label and the CSS var
// declared by `next/font/local` in app/layout.tsx — keep `cssVar` in sync with
// the `variable` names there. Only the wordmark's font varies; nothing else.

export type WordmarkFontKey =
  | 'signpainter'
  | 'cannet'
  | 'material-theories'
  | 'pabricks'
  | 'cyber-punk-city'
  | 'quantum-sector'
  | 'goretax'
  | 'cyberwar';

export type WordmarkFont = {
  key: WordmarkFontKey;
  label: string;
  cssVar: string;
  // Optical size multiplier for contexts that carry their own base font-size
  // (e.g. the quote widget). Display fonts render at wildly different visual sizes
  // at the same point size, so each gets a nudge: SignPainter is the anchor
  // (1, thinnest/largest-set), heavier faces scale down, Cannet Agency furthest.
  scale: number;
};

export const WORDMARK_FONTS: readonly WordmarkFont[] = [
  { key: 'signpainter', label: 'SignPainter', cssVar: '--font-signpainter', scale: 1 },
  { key: 'cannet', label: 'Cannet Agency', cssVar: '--font-cannet', scale: 0.625 },
  { key: 'material-theories', label: 'Material Theories', cssVar: '--font-material-theories', scale: 0.75 },
  { key: 'pabricks', label: 'Pabricks', cssVar: '--font-pabricks', scale: 0.75 },
  { key: 'cyber-punk-city', label: 'SD Cyber Punk City', cssVar: '--font-cyber-punk-city', scale: 0.75 },
  { key: 'quantum-sector', label: 'Quantum Sector', cssVar: '--font-quantum-sector', scale: 0.75 },
  { key: 'goretax', label: 'Goretax', cssVar: '--font-goretax', scale: 0.75 },
  { key: 'cyberwar', label: 'Cyberwar (current)', cssVar: '--font-brand', scale: 0.75 },
];

export const WORDMARK_FONT_STORAGE_KEY = 'midnite.wordmark-font';
export const DEFAULT_WORDMARK_FONT: WordmarkFontKey = 'signpainter';

// CSS var for a key, falling back to the default font when an unknown/stale value
// is read from storage.
export function wordmarkFontVar(key: string): string {
  const match = WORDMARK_FONTS.find((f) => f.key === key);
  const fallback = WORDMARK_FONTS.find((f) => f.key === DEFAULT_WORDMARK_FONT)!;
  return (match ?? fallback).cssVar;
}

// Per-font optical size multiplier for a key, with the same fallback as
// `wordmarkFontVar`. See `WordmarkFont.scale`.
export function wordmarkFontScale(key: string): number {
  const match = WORDMARK_FONTS.find((f) => f.key === key);
  const fallback = WORDMARK_FONTS.find((f) => f.key === DEFAULT_WORDMARK_FONT)!;
  return (match ?? fallback).scale;
}
