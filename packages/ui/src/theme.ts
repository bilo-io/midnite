// Theme runtime entry — exposed as `@midnite/ui/theme`.
//
// The provider + hook are a client component ('use client' in ./theme/theme-context);
// the Vite build preserves that directive on dist/theme.js so a Next.js (RSC)
// consumer gets a real client boundary. The no-flash init script is a plain
// string for the document <head> (runs before React).

export { ThemeProvider, useTheme } from './theme/theme-context';
export type { ThemePreference, ResolvedTheme } from './theme/theme-context';
export { THEME_STORAGE_KEY, themeInitScript } from './theme/theme-script';

/** The theme modes `@midnite/ui` supports (== `ThemePreference`). */
export const THEME_MODES = ['light', 'dark', 'system', 'time'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
