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
    // browser run (`moon run ui:test`) and in the Storybook a11y panel. 'todo'
    // surfaces violations as warnings without failing the run; 'error' fails a
    // story on any violation. Start at 'todo' (same safe default as web) and
    // promote to 'error' once the primitives are audited clean.
    a11y: { test: 'todo' },
  },
};

export default preview;
