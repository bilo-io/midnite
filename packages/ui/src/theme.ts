// Theme runtime entry — exposed as `@midnite/ui/theme`.
//
// Phase 25 Theme A reserves this subpath so the package + build are wired before
// the runtime moves. The actual theme runtime — ThemeProvider, useTheme, the
// no-flash inline script, and theme-toggle — migrates here from
// packages/web/app/theme in Theme B, so any consumer gets theming for free.

/** The theme modes `@midnite/ui` supports — the runtime that consumes them lands in Theme B. */
export const THEME_MODES = ['light', 'dark', 'system', 'time'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
