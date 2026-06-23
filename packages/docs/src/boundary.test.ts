// @vitest-environment node
// (the global env is jsdom, where import.meta.url is an http: URL fileURLToPath
// rejects; this filesystem scan needs node's file: URL.)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// @midnite/docs is a pure consumer of @midnite/ui (Phase 26): the only in-repo
// dependency it may have is `ui`. It must import NOTHING from shared / gateway /
// web / cli / desktop / site. This guard greps the app source (incl. MDX pages)
// for any such import specifier and fails if one appears, enforcing the leaf
// edge `ui ◀── docs` in CI rather than relying on review.

const srcDir = fileURLToPath(new URL('./', import.meta.url));

/** Any in-repo package EXCEPT `ui` (the one allowed dependency). */
const FORBIDDEN_IMPORT = /['"]@midnite\/(shared|web|gateway|cli|desktop|site)(?:\/[^'"]*)?['"]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx|mdx)$/.test(entry.name)) return [];
    // Specs legitimately name other packages (this file does); the rule is about
    // shipped app code, so exclude test files from the scan.
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) return [];
    return [full];
  });
}

describe('@midnite/docs package boundary', () => {
  it('imports nothing in-repo except @midnite/ui (the leaf edge ui ◀── docs)', () => {
    const offenders = sourceFiles(srcDir)
      .filter((file) => FORBIDDEN_IMPORT.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(srcDir.length));

    expect(offenders).toEqual([]);
  });
});
