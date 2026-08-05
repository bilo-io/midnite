import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ApprovalDecidedBySchema,
  ApprovalResolutionSchema,
  type OpsSummary,
} from '@midnite/shared';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';
import { ALL_OPS_WIDGET_TYPES, OPS_WIDGET_CATEGORIES } from '@/lib/ops-widgets';

/**
 * Phase 82 Theme D (ops slice) — static guard for the ops board, mirroring
 * `i18n-dashboard-registry.test.ts`.
 *
 * Three registries feed this slice, and one of them is the reason this file matters more
 * than a key sweep usually would:
 *
 * 1. **`OPS_WIDGETS`** — needs both a picker entry (`ops.catalog.<type>.*`) *and* a card
 *    heading (`ops.cards.<type>.title`). Unlike the dashboard, the two are deliberately
 *    separate here, so a widget can now be half-covered in a way the dashboard's shape
 *    made impossible. Both are swept.
 * 2. **`OPS_WIDGET_CATEGORIES`** — the picker's section headers.
 * 3. **`ApprovalResolutionSchema` / `ApprovalDecidedBySchema`** — the Decisions columns.
 *    These are swept **from the zod enums in `shared`**, not from a list retyped here,
 *    because the bug this slice fixed was exactly a hand-written label map drifting from
 *    the enum: it keyed on `approved`/`denied`/`error`, so seven of eight resolutions
 *    rendered raw. Reading the schema means a vocabulary change fails here, loudly.
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
  'app/(main)/ops/page.tsx',
  'components/ops-add-widget.tsx',
  'components/ops-cost.tsx',
  'components/ops-cycle-fleet.tsx',
  'components/ops-grid.tsx',
  'components/ops-view.tsx',
  'components/run-timeline.tsx',
  'components/runtime-health-panel.tsx',
];

const CATALOGS: Array<[string, Record<string, unknown>]> = [
  ['en-GB', enGB as Record<string, unknown>],
  ['fr-FR', frFR as Record<string, unknown>],
];

// `const <name> = useTranslations('ns')` → the namespace that translator binds to.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe('Phase 82 D — ops i18n keys resolve in en-GB and fr-FR', () => {
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
          const callRe = new RegExp(`\\b${name}(?:\\.rich)?\\(\\s*['"]([a-zA-Z][\\w.-]*)['"]`, 'g');
          for (const m of src.matchAll(callRe)) {
            if (!keyExists(catalog, `${ns}.${m[1]}`)) missing.push(`${ns}.${m[1]}`);
          }
        }
        expect(missing, `unresolved ${localeName} keys in ${rel}`).toEqual([]);
      });
    }
  }

  it('covers every ops widget with a picker label, description AND a card title', () => {
    for (const [localeName, catalog] of CATALOGS) {
      const missing: string[] = [];
      for (const type of ALL_OPS_WIDGET_TYPES) {
        for (const key of [
          `ops.catalog.${type}.label`,
          `ops.catalog.${type}.description`,
          `ops.cards.${type}.title`,
        ]) {
          if (!keyExists(catalog, key)) missing.push(key);
        }
      }
      expect(missing, `${localeName} ops widget copy`).toEqual([]);
    }
  });

  it('covers every picker category', () => {
    for (const [localeName, catalog] of CATALOGS) {
      const missing = OPS_WIDGET_CATEGORIES.map((c) => `ops.categories.${c.key}`).filter(
        (k) => !keyExists(catalog, k),
      );
      expect(missing, `${localeName} ops categories`).toEqual([]);
    }
  });

  // Swept from the zod enums, not a retyped list — see the file docblock.
  it('covers every approval resolution and decided-by value from the shared enums', () => {
    for (const [localeName, catalog] of CATALOGS) {
      const missing: string[] = [];
      for (const r of ApprovalResolutionSchema.options) {
        if (!keyExists(catalog, `ops.decisions.resolution.${r}`)) {
          missing.push(`ops.decisions.resolution.${r}`);
        }
      }
      for (const d of ApprovalDecidedBySchema.options) {
        if (!keyExists(catalog, `ops.decisions.decidedBy.${d}`)) {
          missing.push(`ops.decisions.decidedBy.${d}`);
        }
      }
      expect(missing, `${localeName} approval vocabulary`).toEqual([]);
    }
  });

  it('covers the duration buckets and run outcomes looked up by template literal', () => {
    // Keyed off `OpsSummary`'s own field names so a new bucket in `shared` shows up here.
    const buckets: Array<keyof NonNullable<OpsSummary>['durationBuckets']> = [
      'lt1s',
      'lt5s',
      'lt30s',
      'lt2m',
      'gte2m',
    ];
    for (const [localeName, catalog] of CATALOGS) {
      const missing: string[] = [];
      for (const b of buckets) {
        if (!keyExists(catalog, `ops.duration.buckets.${b}`)) missing.push(`ops.duration.buckets.${b}`);
      }
      for (const o of ['done', 'abandoned', 'failed', 'cancelled']) {
        if (!keyExists(catalog, `ops.outcomes.${o}`)) missing.push(`ops.outcomes.${o}`);
      }
      for (const s of ['ok', 'warn', 'fail']) {
        if (!keyExists(catalog, `ops.runtimeHealth.status.${s}`)) {
          missing.push(`ops.runtimeHealth.status.${s}`);
        }
      }
      for (const g of ['repo', 'project', 'provider']) {
        if (!keyExists(catalog, `ops.cost.groupBy.${g}`)) missing.push(`ops.cost.groupBy.${g}`);
      }
      for (const tab of ['metrics', 'decisions', 'digest']) {
        if (!keyExists(catalog, `ops.tabs.${tab}`)) missing.push(`ops.tabs.${tab}`);
      }
      expect(missing, `${localeName} template-literal families`).toEqual([]);
    }
  });

  it('has no en-GB-only key under ops', () => {
    const leaves: string[] = [];
    const walk = (prefix: string, node: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(node)) {
        const key = `${prefix}.${k}`;
        if (v && typeof v === 'object') walk(key, v as Record<string, unknown>);
        else leaves.push(key);
      }
    };
    walk('ops', (enGB as Record<string, unknown>)['ops'] as Record<string, unknown>);
    expect(leaves.length).toBeGreaterThan(120);
    expect(leaves.filter((k) => !keyExists(frFR as Record<string, unknown>, k))).toEqual([]);
  });
});
