import React from 'react';

import type { Decorator, Preview } from '@storybook/nextjs-vite';

import { ThemeProvider } from '../app/theme/theme-context';
import { THEME_STORAGE_KEY } from '../app/theme/theme-script';
import '../app/globals.css';

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
    nextjs: { appDirectory: true },
    backgrounds: { disable: true },
    controls: { matchers: { color: /color$/i } },
    // @storybook/addon-a11y runs axe-core against every story during the
    // Vitest browser run (`moon run web:test`) and in the Storybook a11y panel.
    // 'todo' surfaces violations as warnings without failing the run; 'error'
    // fails a story on any violation. We start at 'todo' because the current
    // components carry a known backlog (color-contrast, nested-interactive on
    // clickable cards, empty-heading, unlabeled markdown task-list checkboxes —
    // see todo/phase-10 C3). Promote to 'error' (globally, or per-component as
    // each is cleaned) once that backlog is cleared. See .storybook/main.ts.
    a11y: { test: 'todo' },
  },
};

export default preview;
