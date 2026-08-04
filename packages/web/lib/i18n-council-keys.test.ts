import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COUNCIL_FORMATS,
  COUNCIL_MEMBER_RUN_STATUSES,
  COUNCIL_RUN_STATUSES,
} from '@midnite/shared';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';

/**
 * Phase 82 Theme D (council + assistant slice) — static guard that every i18n key
 * referenced by a migrated source in this slice resolves in BOTH en-GB and fr-FR,
 * mirroring `i18n-chrome-keys.test.ts`. Template-literal lookups (the format,
 * run-status, member-status and assistant-entry families) are swept from their
 * registries below, so a value added to `@midnite/shared` — or an entry added to the
 * assistant menu — can't ship without copy in either locale.
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
  'app/(main)/councils/page.tsx',
  'app/(main)/councils/councils-view.tsx',
  'app/(main)/councils/[id]/council-detail-view.tsx',
  'components/council-card.tsx',
  'components/council-create-modal.tsx',
  'components/council-custom-format-modal.tsx',
  'components/council-participants-panel.tsx',
  'components/council-run-tabs.tsx',
  'components/council-run-thread.tsx',
  'components/council-stats.tsx',
  'components/council-table.tsx',
  'components/council-topic-composer.tsx',
  'components/councils-widget.tsx',
  'components/assistant/agent-chat.tsx',
  'components/assistant/assistant-blocks.tsx',
  'components/assistant/assistant-chat.tsx',
  'components/assistant/assistant-fab.tsx',
  'components/assistant/assistant-panel.tsx',
  'lib/use-council-run.ts',
];

const CATALOGS: Array<[string, Record<string, unknown>]> = [
  ['en-GB', enGB as Record<string, unknown>],
  ['fr-FR', frFR as Record<string, unknown>],
];

// `const <name> = useTranslations('ns')` → the namespace that translator binds to.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe('Phase 82 D — council + assistant i18n keys resolve in en-GB and fr-FR', () => {
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
            if (!keyExists(catalog, `${ns}.${key}`)) missing.push(`${ns}.${key}`);
          }
        }
        expect(missing, `unresolved ${localeName} keys in ${rel}`).toEqual([]);
      });
    }
  }

  // --- Registry-driven sweeps for the template-literal lookups ---

  it('covers every council format from the shared registry', () => {
    for (const [localeName, catalog] of CATALOGS) {
      for (const format of COUNCIL_FORMATS) {
        for (const field of ['label', 'description'] as const) {
          expect(
            keyExists(catalog, `council.formats.${format}.${field}`),
            `${localeName} council.formats.${format}.${field}`,
          ).toBe(true);
        }
      }
    }
  });

  it('covers every run status and member status from the shared enums', () => {
    for (const [localeName, catalog] of CATALOGS) {
      for (const status of COUNCIL_RUN_STATUSES) {
        expect(
          keyExists(catalog, `council.runStatus.${status}`),
          `${localeName} council.runStatus.${status}`,
        ).toBe(true);
      }
      for (const status of COUNCIL_MEMBER_RUN_STATUSES) {
        expect(
          keyExists(catalog, `council.run.memberStatus.${status}`),
          `${localeName} council.run.memberStatus.${status}`,
        ).toBe(true);
      }
    }
  });

  it('covers the councils list view modes', () => {
    for (const [localeName, catalog] of CATALOGS) {
      for (const view of ['list', 'grid', 'table']) {
        expect(keyExists(catalog, `council.views.${view}`), `${localeName} council.views.${view}`).toBe(
          true,
        );
      }
    }
  });

  it('covers every assistant menu entry', () => {
    for (const [localeName, catalog] of CATALOGS) {
      for (const key of ['docs', 'guide', 'chat', 'agent', 'report']) {
        for (const field of ['label', 'description'] as const) {
          expect(
            keyExists(catalog, `assistant.entries.${key}.${field}`),
            `${localeName} assistant.entries.${key}.${field}`,
          ).toBe(true);
        }
      }
    }
  });

  it('covers the assistant inference paths, count cells and sparkline metrics', () => {
    for (const [localeName, catalog] of CATALOGS) {
      for (const path of ['deterministic', 'provider']) {
        expect(
          keyExists(catalog, `assistant.agent.path.${path}`),
          `${localeName} assistant.agent.path.${path}`,
        ).toBe(true);
      }
      for (const cell of ['backlog', 'todo', 'inProgress', 'done']) {
        expect(
          keyExists(catalog, `assistant.blocks.counts.${cell}`),
          `${localeName} assistant.blocks.counts.${cell}`,
        ).toBe(true);
      }
      for (const metric of ['cycle-time', 'throughput', 'queue-depth', 'cost']) {
        expect(
          keyExists(catalog, `assistant.blocks.metrics.${metric}`),
          `${localeName} assistant.blocks.metrics.${metric}`,
        ).toBe(true);
      }
    }
  });
});
