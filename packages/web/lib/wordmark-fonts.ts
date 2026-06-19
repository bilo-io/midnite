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
};

export const WORDMARK_FONTS: readonly WordmarkFont[] = [
  { key: 'signpainter', label: 'SignPainter', cssVar: '--font-signpainter' },
  { key: 'cannet', label: 'Cannet Agency', cssVar: '--font-cannet' },
  { key: 'material-theories', label: 'Material Theories', cssVar: '--font-material-theories' },
  { key: 'pabricks', label: 'Pabricks', cssVar: '--font-pabricks' },
  { key: 'cyber-punk-city', label: 'SD Cyber Punk City', cssVar: '--font-cyber-punk-city' },
  { key: 'quantum-sector', label: 'Quantum Sector', cssVar: '--font-quantum-sector' },
  { key: 'goretax', label: 'Goretax', cssVar: '--font-goretax' },
  { key: 'cyberwar', label: 'Cyberwar (current)', cssVar: '--font-brand' },
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
