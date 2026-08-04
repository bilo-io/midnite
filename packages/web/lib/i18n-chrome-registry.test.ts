import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';
import { FEATURES } from '@/lib/features';

/**
 * Phase 82 Theme D (shared-chrome slice) — static guard for the cross-page
 * primitives, mirroring `i18n-chrome-keys.test.ts` (which covers the header /
 * update / title-bar cluster from Theme E).
 *
 * Two things are pinned here:
 *
 * 1. **Every `t()` key** the migrated chrome files reference resolves in en-GB *and*
 *    fr-FR. These components render on nearly every route, so a dropped key would
 *    surface as a raw path app-wide rather than on one page.
 * 2. **The `FEATURES` registry is fully covered.** `lib/feature-labels.ts` resolves
 *    `nav.features.<key>` + `nav.featureDescriptions.<key>` with the registry English
 *    as a fallback; sweeping the registry here means a feature added to
 *    `lib/features.ts` cannot ship without copy in either locale, so that fallback
 *    stays a safety net rather than a habit.
 */

/** Resolve a dotted key against the nested catalog; true if it lands on a string. */
function keyExists(catalog: Record<string, unknown>, dotted: string): boolean {
  let node: unknown = catalog;
  for (const part of dotted.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }
  return typeof node === 'string';
}

const ROOT = join(__dirname, '..');
const FILES = [
  'components/count-pill.tsx',
  'components/desktop-only.tsx',
  'components/feature-gate.tsx',
  'components/resource-not-found.tsx',
  'components/selectable-icon.tsx',
  'components/spinner.tsx',
  'components/status-donut.tsx',
  'components/status-pills.tsx',
  'components/toast.tsx',
  'components/ui/asset-search-select.tsx',
];

const CATALOGS: Array<[string, Record<string, unknown>]> = [
  ['en-GB', enGB as Record<string, unknown>],
  ['fr-FR', frFR as Record<string, unknown>],
];

// `const <name> = useTranslations('ns')` → the namespace that translator binds to.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe('Phase 82 D — shared-chrome i18n keys resolve in en-GB and fr-FR', () => {
  for (const rel of FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));

    it(`binds a translator in ${rel}`, () => {
      expect(binds.length).toBeGreaterThan(0);
    });

    for (const [localeName, catalog] of CATALOGS) {
      it(`resolves every t() key referenced in ${rel} (${localeName})`, () => {
        const missing: string[] = [];
        for (const { name, ns } of binds) {
          const callRe = new RegExp(`\\b${name}(?:\\.rich)?\\(\\s*['"]([a-zA-Z][\\w.]*)['"]`, 'g');
          for (const m of src.matchAll(callRe)) {
            if (!keyExists(catalog, `${ns}.${m[1]}`)) missing.push(`${ns}.${m[1]}`);
          }
        }
        expect(missing, `unresolved ${localeName} keys in ${rel}`).toEqual([]);
      });
    }
  }

  // The registry sweep: label + description for every feature, both locales.
  it('covers every FEATURES entry with a label AND a description', () => {
    for (const [localeName, catalog] of CATALOGS) {
      const missing: string[] = [];
      for (const feature of FEATURES) {
        if (!keyExists(catalog, `nav.features.${feature.key}`)) {
          missing.push(`nav.features.${feature.key}`);
        }
        if (!keyExists(catalog, `nav.featureDescriptions.${feature.key}`)) {
          missing.push(`nav.featureDescriptions.${feature.key}`);
        }
      }
      expect(missing, `${localeName} feature copy`).toEqual([]);
    }
  });

  // Template-literal lookups sweep enum-ish values — pin each family explicitly.
  it('covers the session status pill words', () => {
    for (const [localeName, catalog] of CATALOGS) {
      for (const key of ['actioning', 'awaiting', 'complete']) {
        expect(
          keyExists(catalog, `common.chrome.sessionPill.${key}`),
          `${localeName} common.chrome.sessionPill.${key}`,
        ).toBe(true);
      }
    }
  });

  // A cheap cross-check that the slice didn't leave a half-populated subtree:
  // every en-GB `common.chrome` leaf must exist in fr-FR (the validator enforces
  // this globally, but a local failure names the offending key).
  it('has no en-GB-only key under common.chrome', () => {
    const leaves: string[] = [];
    const walk = (prefix: string, node: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(node)) {
        const key = `${prefix}.${k}`;
        if (v && typeof v === 'object') walk(key, v as Record<string, unknown>);
        else leaves.push(key);
      }
    };
    const common = (enGB as Record<string, unknown>)['common'] as Record<string, unknown>;
    walk('common.chrome', common['chrome'] as Record<string, unknown>);
    expect(leaves.length).toBeGreaterThan(20);
    expect(leaves.filter((k) => !keyExists(frFR as Record<string, unknown>, k))).toEqual([]);
  });
});
