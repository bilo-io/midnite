import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadCatalogs, validateCatalogs } from '../../../scripts/i18n-validate.mjs';
import frMeta from '@/messages/meta/fr-FR.json';

// Phase 82 A — fr-FR is the CI-enforced parity locale: every en-GB key must exist in
// fr-FR, and fr-FR must stay declared `complete`. This guard stops a red CI being
// "fixed" by demoting fr-FR to incomplete (which would silently disable the parity
// check the whole sweep relies on). It runs the real validator over the real,
// on-disk split catalogs — the same thing `moon run web:i18n-validate` does.
const messagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');

describe('fr-FR hard parity (Phase 82 A)', () => {
  it('keeps fr-FR declared complete (no demotion escape hatch)', () => {
    expect((frMeta as { complete?: boolean }).complete).toBe(true);
  });

  it('validates the real catalogs clean with fr-FR at full parity', () => {
    const { catalogs, meta } = loadCatalogs(messagesDir);
    const res = validateCatalogs({ catalogs, meta });
    expect(res.errors).toEqual([]);
    expect(res.ok).toBe(true);
    const fr = res.coverage['fr-FR'];
    expect(fr).toBeDefined();
    expect(fr!.translated).toBe(fr!.total);
  });
});
