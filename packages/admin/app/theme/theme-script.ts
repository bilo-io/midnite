// Re-export shim — the no-flash pre-paint theme init script + storage key live in
// @midnite/ui (Phase 25 Theme B). Plain module (no 'use client') so the server
// root layout can import `themeInitScript` for the <head> script tag.
export { THEME_STORAGE_KEY, themeInitScript } from '@midnite/ui/theme';
