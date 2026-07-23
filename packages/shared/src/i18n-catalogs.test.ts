import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { keyPaths, loadCatalogs, namespaceTotals, validateCatalogs } from '../../../scripts/i18n-validate.mjs';

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

// Phase 82 A — the split-catalog layout (`messages/<locale>/<namespace>.json`) and the
// progress-meter helper. loadCatalogs must merge each locale's fragments back into one
// namespace-keyed catalog (the shape validateCatalogs / the runtime barrel expect).
describe('i18n split-catalog loader (Phase 82 A)', () => {
  const root = mkdtempSync(join(tmpdir(), 'i18n-split-'));
  const write = (locale: string, ns: string, obj: unknown) => {
    mkdirSync(join(root, locale), { recursive: true });
    writeFileSync(join(root, locale, `${ns}.json`), JSON.stringify(obj));
  };
  write('en-GB', 'common', { save: 'Save', cancel: 'Cancel' });
  write('en-GB', 'nav', { home: 'Home' });
  write('fr-FR', 'common', { save: 'Enregistrer', cancel: 'Annuler' });
  write('fr-FR', 'nav', { home: 'Accueil' });
  mkdirSync(join(root, 'de-DE'), { recursive: true }); // intentionally-empty locale
  mkdirSync(join(root, 'meta'), { recursive: true });
  writeFileSync(join(root, 'meta', 'fr-FR.json'), JSON.stringify({ complete: true }));

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('merges per-namespace fragments into one namespace-keyed catalog', () => {
    const { catalogs, meta } = loadCatalogs(root);
    expect(Object.keys(catalogs).sort()).toEqual(['de-DE', 'en-GB', 'fr-FR']); // `meta` dir skipped
    expect(catalogs['en-GB']).toEqual({ common: { save: 'Save', cancel: 'Cancel' }, nav: { home: 'Home' } });
    expect(catalogs['de-DE']).toEqual({}); // empty dir → empty catalog (falls back to en-GB)
    expect(meta['fr-FR']).toEqual({ complete: true });
  });

  it('validates clean against a merged canonical set (spot-check a key per namespace)', () => {
    const { catalogs, meta } = loadCatalogs(root);
    const res = validateCatalogs({ catalogs, meta });
    expect(res.ok).toBe(true);
    expect(res.coverage['fr-FR']).toEqual({ translated: 3, total: 3 });
    expect(res.coverage['de-DE']).toEqual({ translated: 0, total: 3 });
  });

  it('namespaceTotals reports the key count per surface', () => {
    const { catalogs } = loadCatalogs(root);
    expect(namespaceTotals(catalogs['en-GB'] ?? {})).toEqual({ common: 2, nav: 1 });
  });
});
