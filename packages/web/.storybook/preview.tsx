import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Decorator, Preview } from '@storybook/nextjs-vite';

import { LocaleProvider } from '@midnite/shell';

import { ThemeProvider } from '../app/theme/theme-context';
import { THEME_STORAGE_KEY } from '../app/theme/theme-script';
import { ToastProvider } from '../components/toast';
import { CATALOGS } from '../i18n/messages';
import '../app/globals.css';

// Each story gets a fresh QueryClient so state never leaks between tests.
const withQueryClient: Decorator = (Story) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return (
    <QueryClientProvider client={client}>
      <Story />
    </QueryClientProvider>
  );
};

// Seed the stored preference from the toolbar, then remount ThemeProvider so it
// re-reads it — the provider itself toggles the `dark` class on <html>, which is
// what the Tailwind theme variables key off.
const withTheme: Decorator = (Story, { globals }) => {
  const theme = (globals.theme as 'light' | 'dark') ?? 'dark';
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  return (
    <ThemeProvider key={theme}>
      <ToastProvider>
        <div className="min-h-screen bg-background p-6 text-foreground">
          <Story />
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
};

// Every story mounts under the i18n provider (Phase 79 D) — many components now
// call `useTranslations`/`useLocale`, which require it. en-GB (canonical copy).
const withLocale: Decorator = (Story) => (
  <LocaleProvider catalogs={CATALOGS} initialLocale="en-GB">
    <Story />
  </LocaleProvider>
);

const preview: Preview = {
  decorators: [withQueryClient, withLocale, withTheme],
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
    // 'error' fails a story on any violation of an enabled rule (Phase 10 C3).
    //
    // All structural violations cleared (Phase 10 C3 PR #207). `color-contrast`
    // now also enforced: --muted-foreground raised to 38% L (≥4.5:1 on white)
    // and text-muted-foreground/* opacity utilities removed (Phase 10 C3 PR #211).
    a11y: {
      test: 'error',
    },
  },
};

export default preview;
