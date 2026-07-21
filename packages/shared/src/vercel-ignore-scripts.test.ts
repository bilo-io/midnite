import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Test-only import of the Vercel "Ignored Build Step" script's pure helpers
// (Phase 78 Theme A). The script is dependency-free at runtime (it runs on
// Vercel's Node image) and is NOT a runtime dep of `shared`; it's pulled in here
// to pin its build/skip decision and to keep its per-app SUBTREES honest against
// each package's real `moon.yml` dependsOn (Theme D drift guard). The script
// guards `main()` behind an "invoked directly" check, so importing runs no I/O.
import {
  ALWAYS_BUILD,
  decideVercelBuild,
  SUBTREES,
} from '../../../scripts/vercel-ignore.mjs';

// Walk up from the test's cwd (the package dir under moon/vitest) to the repo
// root, identified by its `.moon` workspace dir — avoids `import.meta` (which
// shared's tsconfig module target disallows).
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(resolve(dir, '.moon'))) return dir;
    dir = resolve(dir, '..');
  }
  return process.cwd();
}
const repoRoot = findRepoRoot();

describe('vercel-ignore · decideVercelBuild', () => {
  it('skips any non-production environment (previews off)', () => {
    const r = decideVercelBuild({ app: 'web', env: 'preview', changedFiles: ['packages/web/app/page.tsx'] });
    expect(r.build).toBe(false);
    expect(r.reason).toMatch(/preview/);
  });

  it('skips a non-production branch when env is absent', () => {
    const r = decideVercelBuild({ app: 'web', ref: 'feature/x', changedFiles: ['packages/web/a.ts'] });
    expect(r.build).toBe(false);
  });

  it('builds web when its own source changed on production', () => {
    const r = decideVercelBuild({ app: 'web', env: 'production', changedFiles: ['packages/web/app/page.tsx'] });
    expect(r.build).toBe(true);
  });

  it('builds web when an upstream dep (shared/ui/shell) changed', () => {
    for (const f of ['packages/shared/src/x.ts', 'packages/ui/src/y.ts', 'packages/shell/src/z.ts']) {
      expect(decideVercelBuild({ app: 'web', env: 'production', changedFiles: [f] }).build).toBe(true);
    }
  });

  it('does NOT build web for a docs-only change', () => {
    const r = decideVercelBuild({ app: 'web', env: 'production', changedFiles: ['packages/docs/src/index.mdx'] });
    expect(r.build).toBe(false);
  });

  it('does NOT build docs for a web-only change', () => {
    const r = decideVercelBuild({ app: 'docs', env: 'production', changedFiles: ['packages/web/app/page.tsx'] });
    expect(r.build).toBe(false);
  });

  it('builds docs when ui (its only dep) changed', () => {
    const r = decideVercelBuild({ app: 'docs', env: 'production', changedFiles: ['packages/ui/src/button.tsx'] });
    expect(r.build).toBe(true);
  });

  it('forces a build when a dependency lockfile changed', () => {
    for (const f of ALWAYS_BUILD) {
      expect(decideVercelBuild({ app: 'web', env: 'production', changedFiles: [f] }).build).toBe(true);
    }
  });

  it('fails open (builds) when the diff cannot be computed', () => {
    const r = decideVercelBuild({ app: 'web', env: 'production', changedFiles: null });
    expect(r.build).toBe(true);
    expect(r.reason).toMatch(/fail-open/);
  });

  it('fails open for an unknown app', () => {
    expect(decideVercelBuild({ app: 'gateway', env: 'production', changedFiles: [] }).build).toBe(true);
  });
});

// ── Theme D drift guard ──────────────────────────────────────────────────────
// Keep each app's hand-maintained SUBTREES in lockstep with the transitive
// `moon.yml` dependsOn closure, so a future dep edge can't silently under-deploy.
function transitiveDeps(app: string): Set<string> {
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    let yml: string;
    try {
      yml = readFileSync(resolve(repoRoot, 'packages', id, 'moon.yml'), 'utf8');
    } catch {
      return;
    }
    // Parse the `dependsOn:` block's quoted list entries (no YAML dep needed).
    const block = yml.match(/dependsOn:\s*\n((?:\s*-\s*.*\n)+)/);
    const list = block?.[1];
    if (!list) return;
    for (const m of list.matchAll(/-\s*['"]?([\w-]+)['"]?/g)) {
      if (m[1]) visit(m[1]);
    }
  };
  visit(app);
  return seen;
}

describe('vercel-ignore · SUBTREES ↔ moon.yml dependsOn (drift guard)', () => {
  for (const app of Object.keys(SUBTREES) as Array<keyof typeof SUBTREES>) {
    it(`${app}: subtree covers itself + its transitive dependsOn`, () => {
      const expected = new Set([...transitiveDeps(app)].map((id) => `packages/${id}/`));
      const actual = new Set(SUBTREES[app]);
      expect(actual).toEqual(expected);
    });
  }
});
