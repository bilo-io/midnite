import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia, which @midnite/ui's ThemeProvider queries
// for the system colour-scheme. Stub it (always "no match") so provider-mounting
// tests run under jsdom.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
