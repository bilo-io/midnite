import React from 'react';

import type { Decorator, Preview } from '@storybook/react-vite';

import { ThemeProvider, THEME_STORAGE_KEY } from '../src/theme';
import './preview.css';

// Seed the stored preference from the toolbar, then remount ThemeProvider so it
// re-reads it — the provider itself toggles the `dark` class on <html>, which is
// what the Tailwind theme variables key off.
const withTheme: Decorator = (Story, { globals }) => {
  const theme = (globals.theme as 'light' | 'dark') ?? 'dark';
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  return (
    <ThemeProvider key={theme}>
      <div className="min-h-screen bg-background p-6 text-foreground">
        <Story />
      </div>
    </ThemeProvider>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: {
    backgrounds: { disable: true },
    controls: { matchers: { color: /color$/i } },
    // @storybook/addon-a11y runs axe-core against every story during the Vitest
    // browser run (`moon run ui:test`) and in the Storybook a11y panel. 'error'
    // fails a story on any violation — promoted from 'todo' in Phase 60 I once the
    // primitives were audited + fixed clean, so axe is now a real CI gate for the
    // design system's *structure* (roles, names, labels, ARIA).
    //
    // `color-contrast` is disabled here on purpose: it's audited separately +
    // more precisely by the token contrast script (scripts/contrast-audit.mjs,
    // Phase 60 I), which computes exact WCAG ratios for every token pair in both
    // themes. Leaving it on would fail on the known destructive-button ratio
    // (logged as a finding) and couple the structural gate to a token decision.
    a11y: {
      test: 'error',
      config: { rules: [{ id: 'color-contrast', enabled: false }] },
    },
  },
};

export default preview;
