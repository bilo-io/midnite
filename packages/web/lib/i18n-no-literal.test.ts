import { describe, expect, it } from 'vitest';

import eslintConfig from '../../../eslint.config.mjs';
import { I18N_EXEMPT } from '../../../eslint.i18n-exempt.mjs';

// Phase 82 A — guards the no-hardcoded-string gate wiring so its default-on posture
// can't be silently dropped or the exempt-list mechanism resurrected as an allowlist.
// The rule's *behaviour* (flags a literal, passes a `t()` call) is exercised by the real
// `web:lint`/`shell:lint` over every enforced file; here we pin the config shape.
describe('i18next no-literal-string gate config (Phase 82 A)', () => {
  const block = (
    eslintConfig as Array<{ files?: string[]; ignores?: string[]; rules?: Record<string, unknown> }>
  ).find((c) => c.rules && 'i18next/no-literal-string' in c.rules);

  it('enables i18next/no-literal-string at error severity', () => {
    expect(block).toBeTruthy();
    const rule = block!.rules!['i18next/no-literal-string'] as [string, ...unknown[]];
    expect(rule[0]).toBe('error');
    expect(rule[1]).toMatchObject({ mode: 'jsx-text-only' });
  });

  it('is default-on: gates the whole web + shell/src tsx tree, not a hand-list', () => {
    expect(block!.files).toEqual(
      expect.arrayContaining(['packages/web/**/*.tsx', 'packages/shell/src/**/*.tsx']),
    );
    // The former allowlist mechanism (a per-file `files` array) must not return.
    expect(block!.files).not.toContain('packages/web/app/(auth)/login/page.tsx');
  });

  it('exempts only test/story fixtures — the migration tail is gone', () => {
    expect(block!.ignores).toEqual(expect.arrayContaining(['**/*.test.tsx', '**/*.stories.tsx']));
    // Any exempt path still listed must be wired into `ignores` (bracket-escaped for
    // glob matching). Vacuous today by design — the list is empty; see below.
    for (const p of I18N_EXEMPT) {
      const escaped = p.replace(/[[\]]/g, '\\$&');
      expect(block!.ignores).toContain(escaped);
    }
  });

  it('keeps a Phase-79-migrated file OFF the exempt list (still enforced)', () => {
    // A migrated surface must never be re-exempted — that would silently drop its gate.
    expect(I18N_EXEMPT).not.toContain('packages/web/app/(auth)/login/page.tsx');
    expect(I18N_EXEMPT).not.toContain('packages/web/components/confirm-dialog.tsx');
  });

  it('the global ignores do not exclude the gated tree', () => {
    // The block-level assertions above can all pass while the rule is dead: adding
    // `packages/web/components/**` to eslint.config.mjs's *top-level* `ignores` removes
    // those files from linting entirely, and `i18n-exempt --check` wouldn't notice either
    // because it globs the filesystem rather than the effective ESLint config.
    const globalIgnores = (eslintConfig as { ignores?: string[]; files?: string[] }[])
      .filter((b) => b.ignores && !b.files)
      .flatMap((b) => b.ignores ?? []);
    const swallowsGatedTree = globalIgnores.filter(
      (g) => /^packages\/(web|shell)\//.test(g) && !/\.(test|spec|stories)\.tsx?$/.test(g),
    );
    expect(swallowsGatedTree, 'global ignores exclude part of the gated tree').toEqual([]);
  });

  it('exempt list is EMPTY — Phase 82 Theme F drove the gate to full coverage', () => {
    // Phase 82's closing invariant, and the reason this is an assertion rather than a
    // note in a doc: re-exempting a file now means deleting this line, which shows up in
    // review, instead of appending to a generated list nobody reads. If a genuinely
    // un-gateable file ever needs an exception, change this deliberately and say why.
    expect(I18N_EXEMPT).toEqual([]);
  });

  it('stays sorted and deduped if an exception is ever added back', () => {
    const unique = [...new Set(I18N_EXEMPT)];
    expect(unique.length).toBe(I18N_EXEMPT.length);
    expect([...I18N_EXEMPT].sort()).toEqual(I18N_EXEMPT);
    // No test/story fixtures should live on the list (they're excluded structurally).
    expect(I18N_EXEMPT.some((p) => /\.(test|spec|stories)\.tsx$/.test(p))).toBe(false);
  });
});
