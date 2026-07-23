import type { Locale } from '@midnite/shared';
import type { LocaleMessages } from '@midnite/shell';

import deDE from '../messages/de-DE';
import enGB from '../messages/en-GB';
import esES from '../messages/es-ES';
import frFR from '../messages/fr-FR';

/**
 * The web message catalogs, keyed by locale (Phase 79 Theme B; split per namespace
 * in Phase 82 Theme A).
 *
 * Catalogs are split into `messages/<locale>/<namespace>.json` fragments so parallel
 * migration slices don't collide in one file; each locale's generated barrel
 * (`messages/<locale>/index.ts`, from `scripts/i18n-barrels.mjs`) statically imports
 * its fragments and default-exports the merged tree. Imported here at module scope so
 * the whole catalog still bundles cleanly under `output: 'export'` — there's no server
 * and no request-time catalog resolution. `en-GB` is the canonical source; `fr-FR` is
 * hand-translated. `de-DE`/`es-ES` are intentionally empty for now (deferred MT-seed) —
 * the `LocaleProvider` merges each locale over `en-GB`, so their keys fall back to
 * English until then.
 */
export const CATALOGS: Partial<Record<Locale, LocaleMessages>> = {
  'en-GB': enGB,
  'de-DE': deDE,
  'fr-FR': frFR,
  'es-ES': esES,
};
