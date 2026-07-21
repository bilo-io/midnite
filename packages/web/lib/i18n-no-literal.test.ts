import { describe, expect, it } from 'vitest';

import eslintConfig from '../../../eslint.config.mjs';

// Phase 79 E — guards the no-hardcoded-string gate wiring so it can't be silently
// dropped. The rule's *behaviour* (flags a literal, passes a `t()` call) is exercised
// by the real `moon run web:lint` run over the enforced files; here we pin that the
// config still enables it, at `error`, scoped to the migrated surfaces only.
describe('i18next no-literal-string gate config (Phase 79 E)', () => {
  const block = (eslintConfig as Array<{ files?: string[]; rules?: Record<string, unknown> }>).find(
    (c) => c.rules && 'i18next/no-literal-string' in c.rules,
  );

  it('enables i18next/no-literal-string at error severity', () => {
    expect(block).toBeTruthy();
    const rule = block!.rules!['i18next/no-literal-string'] as [string, ...unknown[]];
    expect(rule[0]).toBe('error');
    expect(rule[1]).toMatchObject({ mode: 'jsx-text-only' });
  });

  it('scopes the gate to migrated surfaces (not the whole tree)', () => {
    expect(block!.files).toBeTruthy();
    expect(block!.files).toContain('packages/web/app/(auth)/login/page.tsx');
    // Must be a bounded allow-list, never a catch-all that would fail the ~500 legacy files.
    expect(block!.files).not.toContain('**/*.tsx');
  });
});
