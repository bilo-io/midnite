import { describe, expect, it } from 'vitest';

import { keyPaths, validateCatalogs } from '../../../scripts/i18n-validate.mjs';

// Phase 79 E — the catalog key-parity gate that `moon run web:i18n-validate` runs.
describe('i18n validateCatalogs', () => {
  const canonical = { common: { save: 'Save', cancel: 'Cancel' }, nav: { home: 'Home' } };

  it('flattens nested catalogs to dotted key paths', () => {
    expect(keyPaths(canonical).sort()).toEqual(['common.cancel', 'common.save', 'nav.home']);
  });

  it('passes when a complete locale matches the canonical key set exactly', () => {
    const res = validateCatalogs({
      catalogs: { 'en-GB': canonical, 'fr-FR': { common: { save: 'Enregistrer', cancel: 'Annuler' }, nav: { home: 'Accueil' } } },
      meta: { 'fr-FR': { complete: true } },
    });
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.coverage['fr-FR']).toEqual({ translated: 3, total: 3 });
  });

  it('fails on an orphan key not present in the canonical catalog (drift)', () => {
    const res = validateCatalogs({
      catalogs: { 'en-GB': canonical, 'fr-FR': { common: { save: 'x', cancel: 'y', typo: 'z' }, nav: { home: 'h' } } },
      meta: { 'fr-FR': { complete: true } },
    });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('orphan key') && e.includes('common.typo'))).toBe(true);
  });

  it('fails when a locale declared complete is missing a canonical key', () => {
    const res = validateCatalogs({
      catalogs: { 'en-GB': canonical, 'fr-FR': { common: { save: 'x' } } },
      meta: { 'fr-FR': { complete: true } },
    });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('missing key') && e.includes('common.cancel'))).toBe(true);
  });

  it('allows an intentionally-incomplete locale (empty de-DE falls back to en-GB)', () => {
    const res = validateCatalogs({
      catalogs: { 'en-GB': canonical, 'de-DE': {} },
      meta: { 'de-DE': { complete: false } },
    });
    expect(res.ok).toBe(true);
    expect(res.coverage['de-DE']).toEqual({ translated: 0, total: 3 });
  });

  it('flags a stale needs-review entry that no longer exists in canonical', () => {
    const res = validateCatalogs({
      catalogs: { 'en-GB': canonical, 'de-DE': {} },
      meta: { 'de-DE': { complete: false, needsReview: ['common.gone'] } },
    });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('stale needs-review') && e.includes('common.gone'))).toBe(true);
  });
});
