import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';
import { APPEARANCE_OPTION_ENTRIES } from '@/lib/appearance-option-labels';

/**
 * Phase 82 Theme F — registry sweep for Settings → Appearance's option tables.
 *
 * These four registries shipped English on a translated page for three slices because
 * they live in a `.ts` module and the lint gate is `jsx-text-only`. A key-resolution
 * audit wouldn't have caught it either: there were no `t()` calls to scan. So the guard
 * has to run the other way round — from the **registry** to the catalog — which also
 * means a fifth motion mode or a new visual effect fails CI unless it ships its copy.
 */

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

describe('Phase 82 F — appearance option registries carry catalog copy', () => {
  it('has entries for all four groups', () => {
    // Guards the derivation: an empty list would make every sweep below vacuous.
    const groups = new Set(APPEARANCE_OPTION_ENTRIES.map((e) => e.group));
    expect([...groups].sort()).toEqual(['density', 'effects', 'motion', 'shimmer']);
    expect(APPEARANCE_OPTION_ENTRIES.length).toBeGreaterThanOrEqual(10);
  });

  for (const locale of ['en-GB', 'fr-FR'] as const) {
    const catalog = (locale === 'en-GB' ? enGB : frFR) as Record<string, unknown>;
    it(`resolves a label and a hint for every option under ${locale}`, () => {
      const missing: string[] = [];
      for (const e of APPEARANCE_OPTION_ENTRIES) {
        for (const field of ['label', 'hint'] as const) {
          const key = `settings.appearance.options.${e.group}.${e.id}.${field}`;
          if (!keyExists(catalog, key)) missing.push(key);
        }
      }
      expect(missing, `unresolved appearance option keys in ${locale}`).toEqual([]);
    });
  }

  it('actually translates the copy rather than copying the English through', () => {
    // The registry English is the fallback, so a fr entry that merely echoes en would
    // resolve fine and still read as English on screen. Labels like "Compact" are
    // legitimately identical across the two, so require most — not all — to differ.
    const differing = APPEARANCE_OPTION_ENTRIES.filter((e) => {
      const path = `settings.appearance.options.${e.group}.${e.id}.hint`;
      const read = (c: Record<string, unknown>) =>
        path.split('.').reduce<unknown>((n, p) => (n as Record<string, unknown>)?.[p], c);
      return read(enGB as Record<string, unknown>) !== read(frFR as Record<string, unknown>);
    });
    expect(differing.length).toBe(APPEARANCE_OPTION_ENTRIES.length);
  });
});
