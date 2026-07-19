// @vitest-environment node
// (This grep-the-source guard uses node fs + a file:// import.meta.url; the
// package's default test env is jsdom, where import.meta.url isn't a file URL.)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// @midnite/shell is a MID-TIER package (Phase 73 Theme B): the wired app frame
// both `web` and `admin` mount. It may depend on `@midnite/shared` + `@midnite/ui`
// ONLY — never on an app or the gateway. This guard greps the shipped source for
// any forbidden workspace import and fails if one appears, so the
// `ui ◀ shell ◀ {web, admin}` edge is enforced in CI rather than by review.

const srcDir = fileURLToPath(new URL('./', import.meta.url));

/** Quoted specifier for any workspace package shell must NOT import. */
const FORBIDDEN_IMPORT = /['"]@midnite\/(web|admin|gateway|cli|desktop|site)(?:\/[^'"]*)?['"]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    // Tests legitimately name other packages (this file does); the rule is about
    // the shipped library graph, so exclude specs from the scan.
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) return [];
    return [full];
  });
}

describe('@midnite/shell package boundary', () => {
  it('imports only from @midnite/shared + @midnite/ui (never web/admin/gateway/cli/desktop/site)', () => {
    const offenders = sourceFiles(srcDir)
      .filter((file) => FORBIDDEN_IMPORT.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(srcDir.length));

    expect(offenders).toEqual([]);
  });
});
