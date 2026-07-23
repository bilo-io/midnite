// Test-only: RTL `render` pre-wrapped in the app's LocaleProvider at en-GB, for
// specs whose components call next-intl's useTranslations (Phase 82). Assertions
// keep matching the English copy; locale-switching behaviour itself is covered by
// lib/i18n-surfaces.test.tsx, which mounts the provider explicitly per locale.
import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { LocaleProvider } from '@midnite/shell';
import type { Locale } from '@midnite/shared';
import { CATALOGS } from '@/i18n/messages';

/** Render pre-wrapped in the app's LocaleProvider. Defaults to en-GB so existing
 *  specs keep asserting English copy; pass `{ locale: 'fr-FR' }` for a fr render. */
export function renderWithIntl(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { locale?: Locale },
) {
  const { locale = 'en-GB', ...rest } = options ?? {};
  function IntlWrapper({ children }: { children: ReactNode }) {
    return (
      <LocaleProvider catalogs={CATALOGS} initialLocale={locale}>
        {children}
      </LocaleProvider>
    );
  }
  return rtlRender(ui, { wrapper: IntlWrapper, ...rest });
}
