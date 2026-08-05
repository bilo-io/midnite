import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';
import {
  APPEARANCE_OPTION_ENTRIES,
  APPEARANCE_REGISTRY_EXPORTS,
} from '@/lib/appearance-option-labels';

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
  it('has entries for all eight groups', () => {
    // Guards the derivation: an empty list would make every sweep below vacuous.
    const groups = new Set(APPEARANCE_OPTION_ENTRIES.map((e) => e.group));
    expect([...groups].sort()).toEqual([
      'bgIntensity',
      'density',
      'editorAutosave',
      'effects',
      'gradientType',
      'motion',
      'shimmer',
      'uiFont',
    ]);
    expect(APPEARANCE_OPTION_ENTRIES.length).toBeGreaterThanOrEqual(24);
  });

  it('covers every label-bearing option registry in app-settings.ts', () => {
    // The bug this file exists for was *missing a registry*, not mistranslating one — and
    // the first fix missed two of the six for exactly that reason. So the source of truth
    // has to be `app-settings.ts` itself: any exported `*_OPTIONS` whose entries carry a
    // `label` must be wired into GROUPS, or a seventh table can render English while every
    // other assertion here passes.
    const src = readFileSync(join(__dirname, 'app-settings.ts'), 'utf8');
    // Match the type annotation up to the `=`, so both `{ … }[]` and `ReadonlyArray<{ … }>`
    // forms are seen — the first version of this regex only handled the former and silently
    // skipped `EDITOR_AUTOSAVE_OPTIONS`, which is the same shape of hole as the original bug.
    const declared = [...src.matchAll(/export const (\w+_OPTIONS)\s*:\s*([^=]+)=/g)]
      .filter((m) => /\blabel\s*:/.test(m[2] ?? ''))
      .map((m) => m[1] ?? '');
    expect(
      declared.length,
      'found no *_OPTIONS registries — the extraction broke',
    ).toBeGreaterThanOrEqual(8);
    // Deliberately excluded, each for a stated reason:
    //  - WORDMARK_* labels are proper nouns / size codes.
    //  - ACCENT_SOLID_OPTIONS has **no consumer anywhere in the repo** (verified by grep),
    //    so it renders nothing; it's a deletion candidate rather than a translation gap.
    const EXCLUDED = new Set([
      'WORDMARK_FONTS',
      'WORDMARK_CASE_OPTIONS',
      'WORDMARK_SIZE_OPTIONS',
      'ACCENT_SOLID_OPTIONS',
    ]);
    const expected = declared.filter((n) => !EXCLUDED.has(n));
    const wired = new Set(Object.values(APPEARANCE_REGISTRY_EXPORTS));
    const missing = expected.filter((n) => !wired.has(n));
    expect(missing, 'label-bearing registries not wired into the i18n seam').toEqual([]);
    // And the reverse: every declared mapping must name a registry that still exists, so a
    // renamed or deleted export can't leave a stale entry silently claiming coverage.
    const declaredSet = new Set(declared);
    const stale = [...wired].filter((n) => !declaredSet.has(n));
    expect(stale, 'seam names a registry that no longer exists in app-settings.ts').toEqual([]);
    // Every group in GROUPS has a declared source.
    const groups = [...new Set(APPEARANCE_OPTION_ENTRIES.map((e) => e.group))];
    expect(groups.filter((g) => !APPEARANCE_REGISTRY_EXPORTS[g])).toEqual([]);
  });

  for (const locale of ['en-GB', 'fr-FR'] as const) {
    const catalog = (locale === 'en-GB' ? enGB : frFR) as Record<string, unknown>;
    it(`resolves a label and a hint for every option under ${locale}`, () => {
      const missing: string[] = [];
      for (const e of APPEARANCE_OPTION_ENTRIES) {
        // A hint key is required only where the registry carries one — `bgIntensity` is
        // labels-only, and the section renders no hint for it.
        const fields = e.hint === '' ? (['label'] as const) : (['label', 'hint'] as const);
        for (const field of fields) {
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
    // legitimately identical across the two, so this checks **hints** only — where every
    // one of ours genuinely differs — and leaves labels unconstrained.
    const withHints = APPEARANCE_OPTION_ENTRIES.filter((e) => e.hint !== '');
    const differing = withHints.filter((e) => {
      const path = `settings.appearance.options.${e.group}.${e.id}.hint`;
      const read = (c: Record<string, unknown>) =>
        path.split('.').reduce<unknown>((n, p) => (n as Record<string, unknown>)?.[p], c);
      return read(enGB as Record<string, unknown>) !== read(frFR as Record<string, unknown>);
    });
    expect(withHints.length).toBeGreaterThanOrEqual(15);
    expect(differing.length).toBe(withHints.length);
  });
});
