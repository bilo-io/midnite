import { describe, expect, it } from 'vitest';

// Test-only import of the GitHub Actions affected-detection script's pure
// helpers (Phase 78 Theme B). Not a runtime dep of `shared`; imported here to
// pin the affected-id → job-gate mapping (esp. fail-open + the web-visual
// group). `main()` is guarded behind an "invoked directly" check.
import { computeAffected, PACKAGES, queryAffected } from '../../../scripts/gh-affected.mjs';

describe('gh-affected · computeAffected', () => {
  it('marks only the affected package(s) true', () => {
    const out = computeAffected({ affectedIds: ['docs', 'ui'], failOpen: false });
    expect(out.docs).toBe('true');
    expect(out.ui).toBe('true');
    expect(out.web).toBe('false');
    expect(out.gateway).toBe('false');
  });

  it('gates code (moon ci) on any package change', () => {
    expect(computeAffected({ affectedIds: ['gateway'], failOpen: false }).code).toBe('true');
    expect(computeAffected({ affectedIds: [], failOpen: false }).code).toBe('false');
  });

  it('webVisual is true for web/ui/shared/shell, false otherwise', () => {
    for (const p of ['web', 'ui', 'shared', 'shell']) {
      expect(computeAffected({ affectedIds: [p], failOpen: false }).webVisual).toBe('true');
    }
    expect(computeAffected({ affectedIds: ['gateway'], failOpen: false }).webVisual).toBe('false');
    expect(computeAffected({ affectedIds: ['docs'], failOpen: false }).webVisual).toBe('false');
  });

  it('fail-open forces every output true', () => {
    const out = computeAffected({ affectedIds: [], failOpen: true });
    for (const p of PACKAGES) expect(out[p]).toBe('true');
    expect(out.code).toBe('true');
    expect(out.webVisual).toBe('true');
    expect(out.failOpen).toBe('true');
  });

  it('a docs-only change does NOT trigger code/webVisual', () => {
    const out = computeAffected({ affectedIds: ['docs'], failOpen: false });
    expect(out.code).toBe('true'); // docs is still a package → moon ci runs
    expect(out.webVisual).toBe('false'); // ...but e2e/visual do not
  });
});

describe('gh-affected · queryAffected', () => {
  it('parses moon JSON into ids and flags a root touch', () => {
    const fake = () => JSON.stringify({ projects: [{ id: 'web' }, { id: 'root' }] });
    const res = queryAffected(fake);
    expect(res.ids).toEqual(['web', 'root']);
    expect(res.rootTouched).toBe(true);
  });

  it('handles an empty affected set', () => {
    const res = queryAffected(() => JSON.stringify({ projects: [] }));
    expect(res.ids).toEqual([]);
    expect(res.rootTouched).toBe(false);
  });
});
