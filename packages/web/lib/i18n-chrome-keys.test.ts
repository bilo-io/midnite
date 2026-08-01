import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';

/**
 * Phase 82 Theme E (app-chrome slice) — static guard that every i18n key
 * referenced by a migrated chrome source (header cluster, update banner stack,
 * shell-component call sites) resolves in BOTH en-GB and fr-FR, mirroring
 * `i18n-dashboard-keys.test.ts`. Template-literal keys
 * (`t(\`header.themeOptions.${value}\`)`, `t(\`features.${key}\`)`) are covered
 * by the enum sweeps below instead.
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
  'components/header/header-icon-button.tsx',
  'components/header/notifications-menu.tsx',
  'components/header/notifications-panel.tsx',
  'components/header/theme-menu.tsx',
  'components/header/user-menu.tsx',
  'components/update/release-notes-popover.tsx',
  'components/update/update-banner-view.tsx',
  'components/update/update-banner.tsx',
  'components/update/update-provider.tsx',
  'components/app-shell-client.tsx',
  'components/desktop-title-bar.tsx',
  'components/screensaver.tsx',
];

const CATALOGS: Array<[string, Record<string, unknown>]> = [
  ['en-GB', enGB as Record<string, unknown>],
  ['fr-FR', frFR as Record<string, unknown>],
];

// `const <name> = useTranslations('ns')` → the namespace that translator binds to.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe('Phase 82 E — app-chrome i18n keys resolve in en-GB and fr-FR', () => {
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
            const key = m[1];
            if (!keyExists(catalog, `${ns}.${key}`)) {
              missing.push(`${ns}.${key}`);
            }
          }
        }
        expect(missing, `unresolved ${localeName} keys in ${rel}`).toEqual([]);
      });
    }
  }

  // Template-literal lookups sweep enum values — pin each family explicitly.
  it('resolves the theme-option enum keys in both locales', () => {
    for (const [localeName, catalog] of CATALOGS) {
      for (const value of ['light', 'dark', 'system', 'time']) {
        expect(
          keyExists(catalog, `nav.header.themeOptions.${value}`),
          `${localeName} nav.header.themeOptions.${value}`,
        ).toBe(true);
      }
    }
  });

  it('covers every feature label the desktop title bar / nav config can look up', async () => {
    const { FEATURES } = await import('@/lib/features');
    for (const [localeName, catalog] of CATALOGS) {
      for (const feature of FEATURES) {
        expect(
          keyExists(catalog, `nav.features.${feature.key}`),
          `${localeName} nav.features.${feature.key}`,
        ).toBe(true);
      }
    }
  });
});
