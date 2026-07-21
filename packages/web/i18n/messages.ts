import type { Locale } from '@midnite/shared';
import type { LocaleMessages } from '@midnite/shell';

import deDE from '../messages/de-DE.json';
import enGB from '../messages/en-GB.json';
import esES from '../messages/es-ES.json';
import frFR from '../messages/fr-FR.json';

/**
 * The web message catalogs, keyed by locale (Phase 79 Theme B).
 *
 * Statically imported into one map at module scope so they bundle cleanly under
 * `output: 'export'` — there's no server and no request-time catalog resolution.
 * `en-GB` is the canonical source; `fr-FR` is hand-translated. `de-DE`/`es-ES` are
 * intentionally empty for now (Theme E will MT-seed them) — the `LocaleProvider`
 * merges each locale over `en-GB`, so their keys fall back to English until then.
 */
export const CATALOGS: Partial<Record<Locale, LocaleMessages>> = {
  'en-GB': enGB,
  'de-DE': deDE,
  'fr-FR': frFR,
  'es-ES': esES,
};
