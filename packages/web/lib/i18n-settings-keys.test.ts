import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';

/**
 * Phase 82 Theme C — static guard that every i18n key referenced by an auth or
 * settings source actually exists in the en-GB catalog. This catches a typo'd or
 * dropped key that neither `tsc` (keys are plain strings) nor `i18n-validate`
 * (catalog-vs-catalog only) would see, across ALL migrated subpages at once —
 * the missing-key safety net behind the per-subpage sweep. fr-FR parity is
 * enforced separately by `i18n-validate`, so an en hit implies a fr hit.
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
  ...globSync('app/(auth)/**/*.tsx', { cwd: ROOT }),
  ...globSync('app/(main)/settings/**/*.tsx', { cwd: ROOT }),
].filter((f) => !/\.(test|stories)\.tsx$/.test(f));

// `const <name> = useTranslations('ns')` → the namespace that translator binds to.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe('Phase 82 C — auth/settings i18n keys resolve in en-GB', () => {
  it('found the migrated source files', () => {
    expect(FILES.length).toBeGreaterThan(40);
  });

  for (const rel of FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));
    if (binds.length === 0) continue; // no i18n in this file (thin wrapper)

    it(`resolves every t() key referenced in ${rel}`, () => {
      const missing: string[] = [];
      for (const { name, ns } of binds) {
        // Match `name('key')` and `name.rich('key')` for THIS translator only.
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
});
