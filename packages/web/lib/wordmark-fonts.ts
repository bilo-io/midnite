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
  // Tailwind text-size for the standalone preview cards. Display fonts render at
  // wildly different visual sizes at the same point size, so each gets an optical
  // nudge to keep the picker balanced: SignPainter larger, Cannet Agency a touch
  // smaller, everything else a touch larger.
  previewSize: string;
  // The same optical intent as `previewSize`, expressed as a relative multiplier
  // for contexts that already carry their own base font-size (e.g. the quote
  // widget). SignPainter is the anchor (1) since it's the thinnest/largest-set;
  // heavier display faces scale down, Cannet Agency furthest. Ratios match the
  // `previewSize` classes (5xl→1, 4xl→0.75, 3xl→0.625).
  scale: number;
};

export const WORDMARK_FONTS: readonly WordmarkFont[] = [
  { key: 'signpainter', label: 'SignPainter', cssVar: '--font-signpainter', previewSize: 'text-5xl', scale: 1 },
  { key: 'cannet', label: 'Cannet Agency', cssVar: '--font-cannet', previewSize: 'text-3xl', scale: 0.625 },
  { key: 'material-theories', label: 'Material Theories', cssVar: '--font-material-theories', previewSize: 'text-4xl', scale: 0.75 },
  { key: 'pabricks', label: 'Pabricks', cssVar: '--font-pabricks', previewSize: 'text-4xl', scale: 0.75 },
  { key: 'cyber-punk-city', label: 'SD Cyber Punk City', cssVar: '--font-cyber-punk-city', previewSize: 'text-4xl', scale: 0.75 },
  { key: 'quantum-sector', label: 'Quantum Sector', cssVar: '--font-quantum-sector', previewSize: 'text-4xl', scale: 0.75 },
  { key: 'goretax', label: 'Goretax', cssVar: '--font-goretax', previewSize: 'text-4xl', scale: 0.75 },
  { key: 'cyberwar', label: 'Cyberwar (current)', cssVar: '--font-brand', previewSize: 'text-4xl', scale: 0.75 },
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
