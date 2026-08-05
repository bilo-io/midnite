import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';

/**
 * Phase 82 Theme D/F close-out (`plan` namespace) — static guard that every i18n key
 * referenced by the last migrated slice resolves in the en-GB catalog, mirroring
 * `i18n-composer-keys.test.ts` and its siblings. fr-FR parity is enforced separately by
 * `i18n-validate` (fr-FR is a `complete` locale), so an en hit implies a fr hit.
 *
 * This slice is unusually ternary-heavy — `notes-panel` picks nine of its keys with
 * `t(cond ? 'a' : 'b')` — so the matcher's ternary pass is what makes the audit
 * non-vacuous here, not a nicety.
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

/** The message at a dotted path, or `''` when it doesn't resolve to a string. */
function messageAt(catalog: Record<string, unknown>, dotted: string): string {
  let node: unknown = catalog;
  for (const part of dotted.split('.')) {
    if (!node || typeof node !== 'object') return '';
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : '';
}

const ROOT = join(__dirname, '..');

/** The `plan` namespace's consumers: the draft-plan flow + the last exempt-list tail. */
const PLAN_FILES = [
  'components/plan-overview-step.tsx',
  'components/breakdown-editor.tsx',
  'components/feature-list-modal.tsx',
  'components/feature-list-pills.tsx',
  'components/notes-panel.tsx',
  'components/work-item-modal.tsx',
];

// `const <name> = useTranslations('ns')` — ns may be nested.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

/**
 * Every literal key a file passes to one of its translators, as `ns.key`.
 *
 * Two matchers, because a key can reach `t()` two ways: a quote straight after the paren,
 * and `t(cond ? 'a' : 'b')`, which the first matcher cannot see at all. The conditional
 * form yields *both* arms, which is what we want to check.
 */
function referencedKeys(src: string): string[] {
  const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));
  const keys: string[] = [];
  for (const { name, ns } of binds) {
    const callRe = new RegExp(`\\b${name}(?:\\.(?:rich|has))?\\(\\s*['"]([a-zA-Z][\\w.-]*)['"]`, 'g');
    for (const m of src.matchAll(callRe)) keys.push(`${ns}.${m[1]}`);

    const ternaryRe = new RegExp(
      `\\b${name}(?:\\.(?:rich|has))?\\(\\s*[^'"()]*\\?\\s*['"]([a-zA-Z][\\w.-]*)['"]\\s*:\\s*['"]([a-zA-Z][\\w.-]*)['"]`,
      'g',
    );
    for (const m of src.matchAll(ternaryRe)) keys.push(`${ns}.${m[1]}`, `${ns}.${m[2]}`);
  }
  return keys;
}

describe('Phase 82 D/F — plan-namespace i18n keys resolve in en-GB', () => {
  for (const rel of PLAN_FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const keys = referencedKeys(src);

    it(`resolves every t() key referenced in ${rel}`, () => {
      // Assert we actually extracted something first: `expect([]).toEqual([])` passes
      // vacuously, so a regex that stopped matching would turn this suite green while
      // auditing nothing.
      expect(keys.length, `extracted no keys from ${rel} — the matcher is broken`).toBeGreaterThan(
        0,
      );
      const missing = keys.filter((k) => !keyExists(enGB as Record<string, unknown>, k));
      expect(missing, `unresolved keys in ${rel}`).toEqual([]);
    });
  }

  it('found a translator in every file in the slice', () => {
    const hasBind = (src: string) => /=\s*useTranslations\(\s*'[^']+'\s*\)/.test(src);
    const without = PLAN_FILES.filter((rel) => !hasBind(readFileSync(join(ROOT, rel), 'utf8')));
    expect(without, 'migrated files with no translator').toEqual([]);
  });

  it('covers every task kind and priority band the breakdown editor offers', async () => {
    // `breakdown-editor` builds its two `StyledSelect` option lists from the shared
    // registries and resolves the wording by template literal, so the enums themselves
    // are the only thing pinning coverage. A kind added to `shared` without catalog copy
    // would otherwise render a raw enum value in the dropdown forever.
    const { TASK_KINDS } = await import('@midnite/shared');
    const catalog = enGB as Record<string, unknown>;
    for (const kind of TASK_KINDS) {
      expect(keyExists(catalog, `board.kinds.${kind}`), kind).toBe(true);
    }
    for (const band of ['low', 'normal', 'high', 'urgent']) {
      expect(keyExists(catalog, `board.priority.${band}`), band).toBe(true);
    }
  });

  it('covers the two columns the feature-list modal can craft into', () => {
    // The destination sheet names its targets through `useStatusLabel()`, i.e. the
    // board's own column vocabulary, rather than restating "Todo" / "Backlog".
    const catalog = enGB as Record<string, unknown>;
    for (const status of ['todo', 'backlog']) {
      expect(keyExists(catalog, `board.columns.${status}`), status).toBe(true);
    }
  });

  it('pluralises the counts instead of branching on 1 in JSX', () => {
    const catalog = enGB as Record<string, unknown>;
    for (const dotted of [
      'plan.featureList.craft',
      'plan.featureList.destinationSubtitle',
      'plan.notes.doneCount',
    ]) {
      expect(keyExists(catalog, dotted), dotted).toBe(true);
      expect(messageAt(catalog, dotted), dotted).toContain('plural');
    }
    // The task-count chip reuses the shared plural rather than adding a fourth.
    expect(keyExists(catalog, 'common.chrome.taskCount')).toBe(true);
  });

  it('reuses the existing generic wording rather than duplicating it', () => {
    const catalog = enGB as Record<string, unknown>;
    for (const key of [
      'common.add',
      'common.cancel',
      'common.close',
      'common.errorTitle',
      'common.removeNamed',
      'task.openPage',
      'task.tabs.session',
    ]) {
      expect(keyExists(catalog, key), key).toBe(true);
    }
  });
});
