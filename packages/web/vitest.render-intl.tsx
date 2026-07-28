// Test-only: RTL `render` pre-wrapped in the app's LocaleProvider at en-GB, for
// specs whose components call next-intl's useTranslations (Phase 82). Assertions
// keep matching the English copy; locale-switching behaviour itself is covered by
// lib/i18n-surfaces.test.tsx, which mounts the provider explicitly per locale.
import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { LocaleProvider } from '@midnite/shell';
import type { Locale } from '@midnite/shared';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { CATALOGS } from '@/i18n/messages';

/** Render pre-wrapped in the app's LocaleProvider (+ ConfirmProvider, since
 *  task-row-shaped components now build their ellipsis menu via `useConfirm`
 *  unconditionally — Phase 82+). Defaults to en-GB so existing specs keep
 *  asserting English copy; pass `{ locale: 'fr-FR' }` for a fr render.
 *  `ConfirmProvider` renders no DOM of its own until a confirm is actually
 *  triggered, so wrapping it here is inert for every existing assertion. */
export function renderWithIntl(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { locale?: Locale },
) {
  const { locale = 'en-GB', ...rest } = options ?? {};
  function IntlWrapper({ children }: { children: ReactNode }) {
    return (
      <LocaleProvider catalogs={CATALOGS} initialLocale={locale}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </LocaleProvider>
    );
  }
  return rtlRender(ui, { wrapper: IntlWrapper, ...rest });
}
