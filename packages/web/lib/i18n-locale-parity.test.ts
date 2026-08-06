import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadCatalogs, validateCatalogs } from '../../../scripts/i18n-validate.mjs';
import deMeta from '@/messages/meta/de-DE.json';
import esMeta from '@/messages/meta/es-ES.json';
import frMeta from '@/messages/meta/fr-FR.json';

// Phase 82 A — fr-FR is the CI-enforced parity locale: every en-GB key must exist in
// fr-FR, and fr-FR must stay declared `complete`. This guard stops a red CI being
// "fixed" by demoting fr-FR to incomplete (which would silently disable the parity
// check the whole sweep relies on). It runs the real validator over the real,
// on-disk split catalogs — the same thing `moon run web:i18n-validate` does.
//
// Phase 79 E follow-up (2026-08-06) — **de-DE and then es-ES were authored to full parity
// too**, and each carries the same guard for the same reason: the only way to make a gap
// green should be to translate the key, never to flip a sidecar back to incomplete. With
// es-ES done, all four declared locales are enforced and none falls back at runtime.
const messagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');

const COMPLETE_LOCALES = [
  ['fr-FR', frMeta],
  ['de-DE', deMeta],
  ['es-ES', esMeta],
] as const satisfies readonly (readonly [string, { complete?: boolean }])[];

describe('complete-locale hard parity (Phase 82 A)', () => {
  for (const [locale, meta] of COMPLETE_LOCALES) {
    it(`keeps ${locale} declared complete (no demotion escape hatch)`, () => {
      expect(meta.complete).toBe(true);
    });
  }

  it('validates the real catalogs clean with every complete locale at full parity', () => {
    const { catalogs, meta } = loadCatalogs(messagesDir);
    const res = validateCatalogs({ catalogs, meta });
    expect(res.errors).toEqual([]);
    expect(res.ok).toBe(true);
    for (const [locale] of COMPLETE_LOCALES) {
      const coverage = res.coverage[locale];
      expect(coverage, `no coverage recorded for ${locale}`).toBeDefined();
      expect(coverage!.translated, `${locale} is not at full parity`).toBe(coverage!.total);
    }
  });
});
