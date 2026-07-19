// @vitest-environment node
// (This grep-the-source guard uses node fs + a file:// import.meta.url; the
// package's default test env is jsdom.)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// @midnite/admin (Phase 73 Theme E) may depend ONLY on @midnite/shell, @midnite/ui
// and @midnite/shared (+ react/next/react-query/lucide/clsx/tailwind-merge). It must
// NEVER import from web/gateway/cli/desktop/site, and never reach into another
// package via a relative-path escape. This guard greps the shipped source and fails
// if either appears, so the `ui ◀ shell ◀ admin` edge is enforced in CI, not review.

const pkgRoot = fileURLToPath(new URL('../', import.meta.url));
const SOURCE_DIRS = ['app', 'components', 'contexts', 'lib'];

/** Quoted specifier for any workspace package admin must NOT import. */
const FORBIDDEN_IMPORT = /['"]@midnite\/(web|gateway|cli|desktop|site)(?:\/[^'"]*)?['"]/;
/** A relative import that climbs out of the package (`../../…` reaches a sibling package). */
const RELATIVE_ESCAPE = /from\s+['"]\.\.\/\.\.\//;

function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    // Specs legitimately name other packages; the rule is about the shipped app.
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) return [];
    return [full];
  });
}

function allSources(): string[] {
  return SOURCE_DIRS.flatMap((d) => sourceFiles(join(pkgRoot, d)));
}

describe('@midnite/admin package boundary', () => {
  it('imports only from @midnite/shell + @midnite/ui + @midnite/shared (never web/gateway/cli/desktop/site)', () => {
    const offenders = allSources()
      .filter((file) => FORBIDDEN_IMPORT.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(pkgRoot.length));

    expect(offenders).toEqual([]);
  });

  it('never reaches into another package via a relative-path escape', () => {
    const offenders = allSources()
      .filter((file) => RELATIVE_ESCAPE.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(pkgRoot.length));

    expect(offenders).toEqual([]);
  });
});
