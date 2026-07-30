import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';

/**
 * Phase 82 Theme D (dashboard slice) — static guard that every i18n key referenced
 * by a migrated dashboard-widget source resolves in the en-GB catalog, mirroring
 * `i18n-settings-keys.test.ts`. fr-FR parity is enforced by `i18n-validate`, so an
 * en hit implies a fr hit. Template-literal keys (`t(\`clockMode.${mode}\`)`) are
 * covered by the enum sweep below instead.
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
  'components/analog-clock-face.tsx',
  'components/calendar-widget.tsx',
  'components/clock-widget.tsx',
  'components/dashboard-add-widget.tsx',
  'components/date-widget.tsx',
  'components/digest-widget.tsx',
  'components/finances-widget.tsx',
  'components/market-asset-widget.tsx',
  'components/market-watchlist-widget.tsx',
  'components/timer-widget.tsx',
  'components/widget-picker-menu.tsx',
  'components/world-clocks-widget.tsx',
];

// `const <name> = useTranslations('ns')` → the namespace that translator binds to.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe('Phase 82 D — dashboard-widget i18n keys resolve in en-GB', () => {
  for (const rel of FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));

    it(`binds a translator in ${rel}`, () => {
      expect(binds.length).toBeGreaterThan(0);
    });

    it(`resolves every t() key referenced in ${rel}`, () => {
      const missing: string[] = [];
      for (const { name, ns } of binds) {
        const callRe = new RegExp(`\\b${name}(?:\\.rich)?\\(\\s*['"]([a-zA-Z][\\w.]*)['"]`, 'g');
        for (const m of src.matchAll(callRe)) {
          const key = m[1];
          if (!keyExists(enGB as Record<string, unknown>, `${ns}.${key}`)) {
            missing.push(`${ns}.${key}`);
          }
        }
      }
      expect(missing, `unresolved keys in ${rel}`).toEqual([]);
    });
  }

  // Template-literal lookups sweep enum values — pin each family explicitly.
  it('resolves the enum-keyed lookups (clock modes, timer phases, catalog, categories)', () => {
    const catalog = enGB as Record<string, unknown>;
    for (const mode of ['digital', 'analogue']) {
      expect(keyExists(catalog, `dashboard.clockMode.${mode}`), `clockMode.${mode}`).toBe(true);
    }
    for (const phase of ['work', 'break']) {
      expect(keyExists(catalog, `dashboard.timer.phase.${phase}`), `timer.phase.${phase}`).toBe(true);
    }
  });

  it('covers every widget type and category in dashboard.catalog / dashboard.categories', async () => {
    const { DASHBOARD_WIDGETS, WIDGET_CATEGORIES } = await import('@/lib/dashboard-widgets');
    const catalog = enGB as Record<string, unknown>;
    for (const type of Object.keys(DASHBOARD_WIDGETS)) {
      expect(keyExists(catalog, `dashboard.catalog.${type}.label`), `catalog.${type}.label`).toBe(true);
      expect(keyExists(catalog, `dashboard.catalog.${type}.description`), `catalog.${type}.description`).toBe(true);
    }
    for (const { key } of WIDGET_CATEGORIES) {
      expect(keyExists(catalog, `dashboard.categories.${key}`), `categories.${key}`).toBe(true);
    }
  });
});
