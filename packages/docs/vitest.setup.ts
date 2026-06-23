import '@testing-library/jest-dom/vitest';

// jsdom ships no matchMedia; @midnite/ui's ThemeProvider reads it on mount to
// resolve `system`/`time`. Provide a minimal stub so the shell renders in tests.
// Guard `window` — the setup also loads for node-env specs (e.g. boundary.test).
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
