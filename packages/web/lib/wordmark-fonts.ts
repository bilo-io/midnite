// The "Midnite" wordmark can be rendered in any of these trial fonts. Each entry
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
  | 'heart-rommatte'
  | 'pinyon-script'
  | 'imperial-script'
  | 'kapakana'
  | 'italianno'
  | 'parisienne'
  | 'arizonia'
  | 'meddon'
  | 'tangerine';

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
  { key: 'cyberwar', label: 'Cyberwar', cssVar: '--font-brand', scale: 0.75 },
  // FontSpace trial fonts — `scale` is a starting optical nudge; tune per-font in
  // the picker if a face renders noticeably larger/smaller than its neighbours.
  { key: 'rooster', label: 'Rooster (brand)', cssVar: '--font-rooster', scale: 0.75 },
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
  // Google Fonts (OFL) script faces — same starting optical nudge as the
  // FontSpace batch; tune per-font in the picker if one sets off-size.
  { key: 'pinyon-script', label: 'Pinyon Script', cssVar: '--font-pinyon-script', scale: 0.75 },
  { key: 'imperial-script', label: 'Imperial Script', cssVar: '--font-imperial-script', scale: 0.75 },
  { key: 'kapakana', label: 'Kapakana', cssVar: '--font-kapakana', scale: 0.75 },
  { key: 'italianno', label: 'Italianno', cssVar: '--font-italianno', scale: 0.75 },
  { key: 'parisienne', label: 'Parisienne', cssVar: '--font-parisienne', scale: 0.75 },
  { key: 'arizonia', label: 'Arizonia', cssVar: '--font-arizonia', scale: 0.75 },
  { key: 'meddon', label: 'Meddon', cssVar: '--font-meddon', scale: 0.75 },
  { key: 'tangerine', label: 'Tangerine', cssVar: '--font-tangerine', scale: 0.75 },
];

// The brand name as it is spelled publicly. `applyWordmarkCase` re-cases it for
// the lower/upper trial options, so this literal is only the canonical form.
// The sibling apps (site, docs, admin) spell it out inline — they can't import
// from `web`.
export const WORDMARK_TEXT = 'Midnite';

export const WORDMARK_FONT_STORAGE_KEY = 'midnite.wordmark-font';
export const DEFAULT_WORDMARK_FONT: WordmarkFontKey = 'signpainter';

// The font the "Midnite" wordmark logo defaults to app-wide (Rooster is the
// brand face). The Settings → Appearance → Logo picker persists a per-user
// override under WORDMARK_FONT_STORAGE_KEY; the Wordmark follows it live,
// falling back to this face until the user picks another. Keep in step with the
// sibling apps that hard-code the same face: site/app/layout.tsx,
// admin/app/layout.tsx and docs/src/styles.css.
export const WORDMARK_LOGO_FONT: WordmarkFontKey = 'rooster';

// The wordmark's letter-casing is a separate, live-configurable trial dimension
// (Settings → Appearance → Logo) so the same face can be judged in lower / title
// / upper case. Only the wordmark string is transformed — nothing else.
export type WordmarkCase = 'lower' | 'title' | 'upper';

export const WORDMARK_CASE_STORAGE_KEY = 'midnite.wordmark-case';
// Title case is the brand's public spelling ("Midnite"); the other two remain
// selectable trial options.
export const DEFAULT_WORDMARK_CASE: WordmarkCase = 'title';

// Ordered for the settings toggle; each label doubles as the live preview of the
// casing it selects.
export const WORDMARK_CASE_OPTIONS: readonly { value: WordmarkCase; label: string }[] = [
  { value: 'lower', label: 'midnite' },
  { value: 'title', label: 'Midnite' },
  { value: 'upper', label: 'MIDNITE' },
];

// The wordmark's size is the third live-configurable trial dimension (Settings →
// Appearance → Logo). Sizes walk the tailwind `text-*` ladder, preserving each
// font's optical step nudge relative to the default. Only the wordmark is
// resized — callers that pin their own `text-*` via className still win
// (tailwind-merge keeps the caller's size).
export type WordmarkSize = 'xs' | 's' | 'm' | 'lg' | 'xl';

export const WORDMARK_SIZE_STORAGE_KEY = 'midnite.wordmark-size';
export const DEFAULT_WORDMARK_SIZE: WordmarkSize = 'm';

// Ordered for the settings toggle, smallest to largest.
export const WORDMARK_SIZE_OPTIONS: readonly { value: WordmarkSize; label: string }[] = [
  { value: 'xs', label: 'XS' },
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'lg', label: 'LG' },
  { value: 'xl', label: 'XL' },
];

// The tailwind text-size ladder the size setting walks. Spelled out as literals
// so the Tailwind scanner generates every step.
const WORDMARK_SIZE_LADDER = [
  'text-xs',
  'text-sm',
  'text-base',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'text-4xl',
] as const;

// Ladder index of each size before the per-font nudge — 'm' is the pre-size
// default (text-xl).
const WORDMARK_SIZE_INDEX: Record<WordmarkSize, number> = { xs: 2, s: 3, m: 4, lg: 5, xl: 6 };

// Tailwind class for a stored size + font, clamped to the ladder. The per-font
// step offsets carry the old hard-coded optical nudges across every size:
// Cannet Agency reads huge at a given point size (three steps down), while
// SignPainter and Quantum Sector render small (one step up). Unknown/stale
// stored sizes fall back to the default, mirroring `wordmarkFontVar`.
export function wordmarkSizeClass(size: string, fontKey: string): string {
  const base =
    WORDMARK_SIZE_INDEX[size as WordmarkSize] ?? WORDMARK_SIZE_INDEX[DEFAULT_WORDMARK_SIZE];
  const offset =
    fontKey === 'cannet' ? -3 : fontKey === 'signpainter' || fontKey === 'quantum-sector' ? 1 : 0;
  const clamped = Math.min(Math.max(base + offset, 0), WORDMARK_SIZE_LADDER.length - 1);
  return WORDMARK_SIZE_LADDER[clamped]!;
}

// Transform a wordmark string to the chosen casing. Always normalises from the
// raw text so a stale/unknown stored value falls through to lowercase.
export function applyWordmarkCase(text: string, wordmarkCase: string): string {
  switch (wordmarkCase) {
    case 'upper':
      return text.toUpperCase();
    case 'title':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    default:
      return text.toLowerCase();
  }
}

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
