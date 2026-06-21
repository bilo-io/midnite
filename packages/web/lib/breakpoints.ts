// Single source of truth for responsive breakpoints (Phase 24 Theme A1).
//
// Both styling paths read from here so CSS and JS never disagree on a cutoff:
//   - Tailwind responsive variants (`md:`, `lg:`, …) — Tailwind's default
//     `screens` use exactly these px values, so a `md:` class and `mediaUp('md')`
//     describe the same width.
//   - JS-driven decisions (nav swap, desktop-only gates) via `useMediaQuery` and
//     the `useIsMobile`/`useIsTablet`/`useIsDesktop` helpers in
//     `hooks/use-media-query.ts`.
//
// Device cutoffs used across the app (Decision §4, settled in the A1 PR):
//   - mobile  — below `md`  (< 768px): single-column, drawer/tab nav
//   - tablet  — `md`–`lg`   (768–1023px)
//   - desktop — `lg` and up (>= 1024px): full multi-column layout
//
// Prefer Tailwind variants for layout that reflows with the viewport; reach for
// the JS hooks only when a component must branch its render (e.g. mount a drawer
// vs. a sidebar) rather than restyle.

/** Width breakpoints in px, aligned with Tailwind's default `screens`. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// `mediaDown` uses a 0.02px offset below the breakpoint — the conventional
// fractional gap that prevents `mediaUp(bp)` and `mediaDown(bp)` from both
// matching at exactly `bp` (and avoids a 1px dead zone between them).
const DOWN_OFFSET = 0.02;

/** `(min-width: …)` — matches at `bp` and wider. Mirrors Tailwind's `bp:` variant. */
export function mediaUp(bp: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[bp]}px)`;
}

/** `(max-width: …)` — matches strictly below `bp`. */
export function mediaDown(bp: Breakpoint): string {
  return `(max-width: ${BREAKPOINTS[bp] - DOWN_OFFSET}px)`;
}

/** Matches the half-open range [min, max) — `min` and wider, but below `max`. */
export function mediaBetween(min: Breakpoint, max: Breakpoint): string {
  return `${mediaUp(min)} and ${mediaDown(max)}`;
}
