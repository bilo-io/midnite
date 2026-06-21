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
  | 'cyberwar'
  | 'rooster'
  | 'cassandra'
  | 'lemon-jelly'
  | 'radeil-3d'
  | 'quicking'
  | 'pardell'
  | 'october-twilight'
  | 'mollina-signature'
  | 'campana-script'
  | 'majestic'
  | 'quick-kiss'
  | 'danny-brassco'
  | 'fasthin'
  | 'consultant'
  | 'watermelon-script'
  | 'bite-chocolate'
  | 'lovya'
  | 'southern-aire'
  | 'brooklyn'
  | 'bettani-sellia'
  | 'amsterdam'
  | 'brotherland-signature'
  | 'heart-rommatte';

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
  // FontSpace trial fonts — `scale` is a starting optical nudge; tune per-font in
  // the picker if a face renders noticeably larger/smaller than its neighbours.
  { key: 'rooster', label: 'Rooster', cssVar: '--font-rooster', scale: 0.75 },
  { key: 'cassandra', label: 'Cassandra', cssVar: '--font-cassandra', scale: 0.75 },
  { key: 'lemon-jelly', label: 'Lemon Jelly', cssVar: '--font-lemon-jelly', scale: 0.75 },
  { key: 'radeil-3d', label: 'Radeil 3D', cssVar: '--font-radeil-3d', scale: 0.75 },
  { key: 'quicking', label: 'Quicking', cssVar: '--font-quicking', scale: 0.75 },
  { key: 'pardell', label: 'Pardell', cssVar: '--font-pardell', scale: 0.75 },
  { key: 'october-twilight', label: 'October Twilight', cssVar: '--font-october-twilight', scale: 0.75 },
  { key: 'mollina-signature', label: 'Mollina Signature', cssVar: '--font-mollina-signature', scale: 0.75 },
  { key: 'campana-script', label: 'Campana Script', cssVar: '--font-campana-script', scale: 0.75 },
  { key: 'majestic', label: 'Majestic', cssVar: '--font-majestic', scale: 0.75 },
  { key: 'quick-kiss', label: 'Quick Kiss', cssVar: '--font-quick-kiss', scale: 0.75 },
  { key: 'danny-brassco', label: 'Danny Brassco', cssVar: '--font-danny-brassco', scale: 0.75 },
  { key: 'fasthin', label: 'Fasthin', cssVar: '--font-fasthin', scale: 0.75 },
  { key: 'consultant', label: 'Consultant', cssVar: '--font-consultant', scale: 0.75 },
  { key: 'watermelon-script', label: 'Watermelon Script', cssVar: '--font-watermelon-script', scale: 0.75 },
  { key: 'bite-chocolate', label: 'Bite Chocolate', cssVar: '--font-bite-chocolate', scale: 0.75 },
  { key: 'lovya', label: 'Lovya', cssVar: '--font-lovya', scale: 0.75 },
  { key: 'southern-aire', label: 'Southern Aire', cssVar: '--font-southern-aire', scale: 0.75 },
  { key: 'brooklyn', label: 'Brooklyn', cssVar: '--font-brooklyn', scale: 0.75 },
  { key: 'bettani-sellia', label: 'Bettani Sellia', cssVar: '--font-bettani-sellia', scale: 0.75 },
  { key: 'amsterdam', label: 'Amsterdam', cssVar: '--font-amsterdam', scale: 0.75 },
  { key: 'brotherland-signature', label: 'Brotherland Signature', cssVar: '--font-brotherland-signature', scale: 0.75 },
  { key: 'heart-rommatte', label: 'Heart Rommatte', cssVar: '--font-heart-rommatte', scale: 0.75 },
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
