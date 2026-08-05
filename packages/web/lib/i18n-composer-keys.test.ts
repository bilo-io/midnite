import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';

/**
 * Phase 82 Theme D (composer / editors / pickers residue slice) — static guard that
 * every i18n key referenced by a migrated source resolves in the en-GB catalog,
 * mirroring `i18n-residue-keys.test.ts` and its siblings. fr-FR parity is enforced
 * separately by `i18n-validate` (fr-FR is a `complete` locale), so an en hit implies
 * a fr hit.
 *
 * The memory-source trio (`source-list-editor`, `source-kind-multi-select`,
 * `memories-tree`) landed in the same slice but audits from `i18n-memory-keys.test.ts`,
 * where the rest of the `memory` namespace already lives.
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

const ROOT = join(__dirname, '..');

/** The session composer + chat bar → `sessions.composer.*` / `sessions.chatBar.*`. */
const COMPOSER_FILES = [
  'components/prompt-composer.tsx',
  'components/composer-fullscreen.tsx',
  'components/chat-bar.tsx',
];

/** Markdown + expression editors → `common.editor.*` / `workflows.expression.*`. */
const EDITOR_FILES = [
  'components/markdown-editor.tsx',
  'components/markdown-preview.tsx',
  'components/expression-editor.tsx',
];

/** Generic pickers + the shared details modal → `common.pickers.*`. */
const PICKER_FILES = [
  'components/folder-picker.tsx',
  'components/tag-color-picker.tsx',
  'components/edit-details-modal.tsx',
];

// `const <name> = useTranslations('ns')` — ns may be nested.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

/**
 * Every literal key a file passes to one of its translators, as `ns.key`.
 *
 * Files that bind more than one namespace under distinct names (`t` + `tCommon`)
 * resolve correctly because the call matcher is built per binding name.
 */
function referencedKeys(src: string): string[] {
  const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));
  const keys: string[] = [];
  for (const { name, ns } of binds) {
    const callRe = new RegExp(`\\b${name}(?:\\.(?:rich|has))?\\(\\s*['"]([a-zA-Z][\\w.-]*)['"]`, 'g');
    for (const m of src.matchAll(callRe)) keys.push(`${ns}.${m[1]}`);
  }
  return keys;
}

const ALL = [...COMPOSER_FILES, ...EDITOR_FILES, ...PICKER_FILES];

describe('Phase 82 D — composer/editors/pickers i18n keys resolve in en-GB', () => {
  for (const rel of ALL) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const keys = referencedKeys(src);

    it(`resolves every t() key referenced in ${rel}`, () => {
      const missing = keys.filter((k) => !keyExists(enGB as Record<string, unknown>, k));
      expect(missing, `unresolved keys in ${rel}`).toEqual([]);
    });
  }

  it('found a translator in every migrated file in the slice', () => {
    // A fresh, non-global matcher per file — a shared /g regex would carry
    // `lastIndex` across calls and undercount.
    const hasBind = (src: string) => /=\s*useTranslations\(\s*'[^']+'\s*\)/.test(src);
    const without = ALL.filter((rel) => !hasBind(readFileSync(join(ROOT, rel), 'utf8')));
    expect(without, 'migrated files with no translator').toEqual([]);
  });

  it('covers every chat inference path', async () => {
    // `chat-bar.tsx` reads `chatBar.inferencePath.<path>` instead of importing
    // `CHAT_INFERENCE_PATH_LABEL`, so the union is the only thing pinning coverage.
    const { CHAT_INFERENCE_PATHS } = await import('@midnite/shared');
    for (const path of CHAT_INFERENCE_PATHS) {
      expect(
        keyExists(enGB as Record<string, unknown>, `sessions.chatBar.inferencePath.${path}`),
        path,
      ).toBe(true);
    }
  });

  it('keys the expression-editor accessible names on the field, not on concatenation', () => {
    // The pre-migration code built these by interpolating an already-translated field
    // label into an English template, so fr-FR rendered "URL expression". Each is now a
    // whole-sentence ICU message taking `field`, which is what lets French reorder it.
    const catalog = enGB as Record<string, unknown>;
    const src = readFileSync(join(ROOT, 'components/expression-editor.tsx'), 'utf8');
    for (const key of ['fieldAria', 'suggestionsAria']) {
      expect(keyExists(catalog, `workflows.expression.${key}`), key).toBe(true);
      const message = (
        (catalog.workflows as Record<string, Record<string, unknown>>).expression as Record<
          string,
          string
        >
      )[key];
      expect(message, `${key} must interpolate the field name`).toContain('{field}');
    }
    // No accessible name may be assembled from a template literal any more.
    expect(src).not.toMatch(/aria-label=\{`/);
  });

  it('reuses the existing generic wording rather than duplicating it', () => {
    const catalog = enGB as Record<string, unknown>;
    // The markdown editor's Edit tab reads `common.edit`; only Preview needed a key.
    for (const key of ['common.edit', 'common.save', 'common.cancel', 'common.close']) {
      expect(keyExists(catalog, key), key).toBe(true);
    }
    expect(keyExists(catalog, 'common.editor.previewTab')).toBe(true);
  });
});
