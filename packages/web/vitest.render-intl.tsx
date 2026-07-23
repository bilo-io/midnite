// Test-only: RTL `render` pre-wrapped in the app's LocaleProvider at en-GB, for
// specs whose components call next-intl's useTranslations (Phase 82). Assertions
// keep matching the English copy; locale-switching behaviour itself is covered by
// lib/i18n-surfaces.test.tsx, which mounts the provider explicitly per locale.
import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { LocaleProvider } from '@midnite/shell';
import { CATALOGS } from '@/i18n/messages';

function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider catalogs={CATALOGS} initialLocale="en-GB">
      {children}
    </LocaleProvider>
  );
}

export function renderWithIntl(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: IntlWrapper, ...options });
}
