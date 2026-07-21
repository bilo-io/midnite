import type { ReactElement } from 'react';
import { LocaleProvider } from '@midnite/shell';
import type { Locale } from '@midnite/shared';

import { CATALOGS } from '@/i18n/messages';

/**
 * Wrap a tree in the next-intl `LocaleProvider` for tests (Phase 79 D).
 *
 * Components converted to `useTranslations`/`useLocale` need the provider — mounted
 * globally in the app — present in tests too. Defaults to en-GB so assertions read
 * the canonical copy; pass a locale to exercise a translation.
 */
export function withLocale(ui: ReactElement, locale: Locale = 'en-GB'): ReactElement {
  return (
    <LocaleProvider catalogs={CATALOGS} initialLocale={locale}>
      {ui}
    </LocaleProvider>
  );
}
