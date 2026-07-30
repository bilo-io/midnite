import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';

/**
 * Phase 82 Theme D (roadmap/task-graph/slides/safety slice) — static guard that
 * every i18n key referenced by a migrated source resolves in the en-GB catalog,
 * mirroring `i18n-settings-keys.test.ts` / `i18n-dashboard-keys.test.ts`. fr-FR
 * parity is enforced by `i18n-validate` (fr-FR is a `complete` locale).
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
  'components/roadmap/milestone-breakdown-modal.tsx',
  'components/roadmap/milestone-graph-node.tsx',
  'components/roadmap/milestone-graph-view.tsx',
  'components/roadmap/roadmap-board.tsx',
  'components/roadmap/roadmap-lane.tsx',
  'components/safety/safety-caps-panel.tsx',
  'components/safety/safety-decisions-feed.tsx',
  'components/slides/deck-card.tsx',
  'components/slides/deck-editor.tsx',
  'components/slides/deck-rail.tsx',
  'components/slides/deck-source-editor.tsx',
  'components/slides/deck.tsx',
  'components/task-graph/task-graph-node.tsx',
  'components/task-graph/task-graph-view.tsx',
  'app/(main)/slides/page.tsx',
  'app/(main)/slides/new/page.tsx',
  'app/(main)/slides/edit/page.tsx',
  'app/(main)/slides/present/page.tsx',
  'app/(main)/slides/slides-view.tsx',
];

// `const <name> = useTranslations('ns')` — ns may be nested ('roadmap.board').
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe('Phase 82 D — roadmap/slides/safety i18n keys resolve in en-GB', () => {
  for (const rel of FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));

    it(`binds a translator in ${rel}`, () => {
      expect(binds.length).toBeGreaterThan(0);
    });

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
});
