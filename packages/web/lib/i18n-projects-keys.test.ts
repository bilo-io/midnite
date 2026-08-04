import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';

/**
 * Phase 82 Theme D (projects + pr-review slice) — static guard that every i18n key
 * referenced by a migrated source resolves in the en-GB catalog, mirroring
 * `i18n-settings-keys.test.ts` / `i18n-memory-keys.test.ts`. fr-FR parity is enforced
 * separately by `i18n-validate` (fr-FR is a `complete` locale), so an en hit implies a
 * fr hit. The enum + template sweeps at the bottom cover the template-literal lookups
 * the regex can't see, by walking the shared registries themselves.
 *
 * This catches the failure mode Theme C hit for real: a `t()` call whose key never made
 * it into the catalog renders the raw key path in production but breaks no build.
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

const PROJECT_FILES = [
  'app/(main)/projects/page.tsx',
  'app/(main)/projects/projects-view.tsx',
  'app/(main)/projects/view/project-detail-view.tsx',
  'components/all-projects-widget.tsx',
  'components/project-card.tsx',
  'components/project-modal.tsx',
  'components/project-progress.tsx',
  'components/project-select.tsx',
  'components/project-status-badge.tsx',
  'components/projects-tree.tsx',
  'components/projects/panels/project-cost-card.tsx',
  'components/projects/panels/project-details-panel.tsx',
  'components/projects/panels/project-docs-panel.tsx',
  'components/projects/panels/project-plan-panel.tsx',
  'components/projects/panels/project-roadmap-panel.tsx',
  'components/projects/panels/project-tasks-panel.tsx',
  'components/projects/project-info-panel.tsx',
  'components/projects/project-repo-status.tsx',
  'components/projects/project-stats-panel.tsx',
  'components/recent-projects.tsx',
  'components/template-card.tsx',
  'components/template-modal.tsx',
  'components/templates-table.tsx',
];

const PR_REVIEW_FILES = [
  'components/checks-panel.tsx',
  'components/pr-review/diff-file-tree.tsx',
  'components/pr-review/diff-file.tsx',
  'components/pr-review/pr-diff-modal.tsx',
  'components/pr-review/pr-diff-viewer.tsx',
  'components/pr-review/pr-review-actions.tsx',
  'components/pr-review/pr-review-panel.tsx',
];

/**
 * `lib/i18n-labels.ts` and `lib/project-template-labels.ts` are deliberately **not**
 * scanned here. Both build their keys from template literals the regex can't read, and
 * `i18n-labels.ts` binds a `t` per hook — a file-scoped matcher would pair every call
 * with every namespace in the file and report a cross-product of phantom misses. The
 * enum + registry sweeps at the bottom of this suite cover those lookups properly, by
 * walking the shared enums/registries the hooks key off.
 */

// `const <name> = useTranslations('ns')` — ns may be nested.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

/** Every literal key a file passes to one of its translators, as `ns.key`. */
function referencedKeys(src: string): string[] {
  const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));
  const keys: string[] = [];
  for (const { name, ns } of binds) {
    // `t('a.b')`, `t.rich('a.b')` and `t.has('a.b')` all address the same catalog.
    const callRe = new RegExp(`\\b${name}(?:\\.(?:rich|has))?\\(\\s*['"]([a-zA-Z][\\w.-]*)['"]`, 'g');
    for (const m of src.matchAll(callRe)) keys.push(`${ns}.${m[1]}`);
  }
  return keys;
}

describe('Phase 82 D — projects + pr-review i18n keys resolve in en-GB', () => {
  for (const rel of [...PROJECT_FILES, ...PR_REVIEW_FILES]) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const keys = referencedKeys(src);
    if (keys.length === 0) continue; // a wrapper that only forwards props

    it(`resolves every t() key referenced in ${rel}`, () => {
      const missing = keys.filter((k) => !keyExists(enGB as Record<string, unknown>, k));
      expect(missing, `unresolved keys in ${rel}`).toEqual([]);
    });
  }

  it('found translators across the migrated projects sources', () => {
    // A fresh, non-global matcher per file — a shared /g regex would carry `lastIndex`
    // across calls and undercount.
    const hasBind = (src: string) => /=\s*useTranslations\(\s*'[^']+'\s*\)/.test(src);
    const withBinds = PROJECT_FILES.filter((rel) => hasBind(readFileSync(join(ROOT, rel), 'utf8')));
    expect(withBinds.length).toBeGreaterThanOrEqual(20);
  });

  it('found translators across the migrated pr-review sources', () => {
    const hasBind = (src: string) => /=\s*useTranslations\(\s*'[^']+'\s*\)/.test(src);
    const withBinds = PR_REVIEW_FILES.filter((rel) => hasBind(readFileSync(join(ROOT, rel), 'utf8')));
    expect(withBinds.length).toBe(PR_REVIEW_FILES.length);
  });

  // The enum-keyed lookups the i18n-labels hooks build by template literal.
  it('covers every project requirement, review event, merge method and check trigger', async () => {
    const { PROJECT_REQUIREMENTS, PR_REVIEW_EVENTS, PR_MERGE_METHODS } = await import('@midnite/shared');
    const catalog = enGB as Record<string, unknown>;
    for (const requirement of PROJECT_REQUIREMENTS) {
      expect(keyExists(catalog, `projects.requirements.${requirement}`), requirement).toBe(true);
    }
    for (const event of PR_REVIEW_EVENTS) {
      expect(keyExists(catalog, `prReview.events.${event}`), `prReview.events.${event}`).toBe(true);
    }
    for (const method of PR_MERGE_METHODS) {
      expect(keyExists(catalog, `prReview.mergeMethods.${method}`), `prReview.mergeMethods.${method}`).toBe(
        true,
      );
    }
    for (const trigger of ['gate', 'manual', 'auto-fix']) {
      expect(keyExists(catalog, `prReview.checks.triggers.${trigger}`), trigger).toBe(true);
    }
    for (const status of ['add', 'delete', 'modify', 'rename', 'copy']) {
      expect(keyExists(catalog, `prReview.diffStatus.${status}`), status).toBe(true);
    }
    for (const verdict of ['approved', 'commented', 'changes-requested']) {
      expect(keyExists(catalog, `prReview.aiVerdict.${verdict}`), verdict).toBe(true);
    }
  });

  // Registry-driven: a template added to `shared` without catalog copy would silently
  // fall back to English forever, so fail the build instead.
  it('covers every built-in project doc template', async () => {
    const { PROJECT_DOC_TEMPLATES } = await import('@midnite/shared');
    const catalog = enGB as Record<string, unknown>;
    expect(PROJECT_DOC_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of PROJECT_DOC_TEMPLATES) {
      expect(keyExists(catalog, `projects.templates.${template.id}.name`), template.id).toBe(true);
      expect(keyExists(catalog, `projects.templates.${template.id}.description`), template.id).toBe(true);
    }
  });

  it('covers every relative-time bucket the shared hook renders', () => {
    const catalog = enGB as Record<string, unknown>;
    for (const bucket of ['justNow', 'minutesAgo', 'hoursAgo', 'daysAgo']) {
      expect(keyExists(catalog, `common.relativeTime.${bucket}`), bucket).toBe(true);
    }
  });
});
