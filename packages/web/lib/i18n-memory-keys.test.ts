import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';

/**
 * Phase 82 Theme D (memory slice) — static guard that every i18n key referenced
 * by a migrated memory source resolves in the en-GB catalog, mirroring
 * `i18n-settings-keys.test.ts` / `i18n-dashboard-keys.test.ts`. fr-FR parity is
 * enforced separately by `i18n-validate` (fr-FR is a `complete` locale), so an
 * en hit implies a fr hit. The enum sweep at the bottom covers the
 * template-literal lookups the regex can't see (artifact kinds/statuses, source
 * ingest states, source kinds) by walking the shared enums themselves.
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
const FILES = [
  'app/(main)/memory/memory-view.tsx',
  'app/(main)/memory/page.tsx',
  'app/(main)/memory/view/memory-detail-view.tsx',
  'components/memories-tree.tsx',
  'components/memory-card.tsx',
  'components/memory-modal.tsx',
  'components/memory/add-source-modal.tsx',
  'components/memory/memory-artifact-viewer.tsx',
  'components/memory/memory-chat-composer.tsx',
  'components/memory/memory-doc-panel.tsx',
  'components/memory/memory-metadata-modal.tsx',
  'components/memory/memory-scope.tsx',
  'components/memory/memory-sources-panel.tsx',
  'components/memory/memory-studio-rail.tsx',
  'components/memory/source-detail-modal.tsx',
  'components/source-kind-multi-select.tsx',
  'components/source-list-editor.tsx',
];

// `const <name> = useTranslations('ns')` — ns may be nested ('memory.sources').
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe('Phase 82 D — memory i18n keys resolve in en-GB', () => {
  for (const rel of FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));
    if (binds.length === 0) continue; // string-free wrapper (e.g. a Suspense boundary)

    it(`resolves every t() key referenced in ${rel}`, () => {
      const missing: string[] = [];
      for (const { name, ns } of binds) {
        const callRe = new RegExp(`\\b${name}(?:\\.rich)?\\(\\s*['"]([a-zA-Z][\\w.-]*)['"]`, 'g');
        for (const m of src.matchAll(callRe)) {
          if (!keyExists(enGB as Record<string, unknown>, `${ns}.${m[1]}`)) {
            missing.push(`${ns}.${m[1]}`);
          }
        }
      }
      expect(missing, `unresolved keys in ${rel}`).toEqual([]);
    });
  }

  it('found translators in the migrated memory sources', () => {
    // A fresh, non-global matcher per file — a shared /g regex would carry
    // `lastIndex` across calls and undercount.
    const hasBind = (src: string) => /=\s*useTranslations\(\s*'[^']+'\s*\)/.test(src);
    const withBinds = FILES.filter((rel) => hasBind(readFileSync(join(ROOT, rel), 'utf8')));
    expect(withBinds.length).toBeGreaterThanOrEqual(12);
  });

  // The enum-keyed lookups the i18n-labels hooks build by template literal.
  it('covers every artifact kind, artifact status, source ingest state and source kind', async () => {
    const { MEMORY_ARTIFACT_KINDS, MEMORY_ARTIFACT_STATUSES, SOURCE_KINDS } =
      await import('@midnite/shared');
    const catalog = enGB as Record<string, unknown>;
    for (const kind of MEMORY_ARTIFACT_KINDS) {
      expect(keyExists(catalog, `memory.kinds.${kind}`), `memory.kinds.${kind}`).toBe(true);
    }
    for (const status of MEMORY_ARTIFACT_STATUSES) {
      expect(
        keyExists(catalog, `memory.artifactStatus.${status}`),
        `memory.artifactStatus.${status}`,
      ).toBe(true);
    }
    for (const state of ['pending', 'ready', 'failed']) {
      expect(keyExists(catalog, `memory.sourceState.${state}`), `memory.sourceState.${state}`).toBe(
        true,
      );
    }
    // `useSourceKindLabel` falls back to shared's English map per key, so a gap here
    // degrades silently rather than throwing — hence the explicit sweep.
    for (const kind of SOURCE_KINDS) {
      expect(keyExists(catalog, `memory.sourceKinds.${kind}`), `memory.sourceKinds.${kind}`).toBe(
        true,
      );
    }
  });
});
