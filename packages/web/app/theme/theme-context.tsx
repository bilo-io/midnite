'use client';

// Re-export shim — the theme runtime now lives in @midnite/ui (Phase 25 Theme B).
// Kept so existing `@/app/theme/theme-context` import sites compile unchanged; a
// later sweep rewrites them to `@midnite/ui/theme` and deletes this file.
export { ThemeProvider, useTheme } from '@midnite/ui/theme';
export type { ThemePreference, ResolvedTheme } from '@midnite/ui/theme';
