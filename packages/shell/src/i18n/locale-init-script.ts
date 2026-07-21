import { DEFAULT_LOCALE, SUPPORTED_LOCALE_CODES, resolveLocale } from '@midnite/shared';

import { SETTINGS_STORAGE_KEY } from '../appearance/constants';

/**
 * Pre-paint locale init (Phase 79 Theme B) — the i18n companion to
 * `appearanceInitScript`. Runs synchronously in the document `<head>` before
 * first paint: reads the persisted `locale` from the same `AppSettings`
 * localStorage blob the appearance script uses, resolves it against the browser
 * language (pref → nearest browser locale → default), and stamps
 * `document.documentElement.lang` so the very first frame carries the right
 * language attribute (no flash / no hydration surprise).
 *
 * `resolveLocale`'s source is embedded verbatim via `.toString()` — the exact same
 * implementation the runtime `LocaleProvider` and the tests use, so there's no
 * drift between first-paint and hydrated resolution. The supported codes and
 * default are serialised in, keeping the embedded function self-contained.
 */
export const localeInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${SETTINGS_STORAGE_KEY}')||'{}');var codes=${JSON.stringify(
  SUPPORTED_LOCALE_CODES,
)};var resolve=${resolveLocale.toString()};var nav=(typeof navigator!=='undefined'&&navigator.language)||null;document.documentElement.lang=resolve(s.locale,nav,codes,'${DEFAULT_LOCALE}');}catch(e){}})();`;
