import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Static DI-hygiene guard (mirrors the boundary tests' style).
 *
 * Nest resolves an undecorated constructor param from tsc's emitted type
 * metadata — which silently degrades to `Object`/`Function` when the type
 * arrives via `import type` (and vanishes entirely under esbuild/tsx). Paired
 * with `@Optional()`, the failure is INVISIBLE: the param injects `undefined`
 * and the feature quietly disables itself. That exact combination shipped a
 * fail-open REST auth guard (`gateway-auth.guard.ts`: `import type
 * { JwtService }` + `@Optional()` ⇒ `jwtSvc === undefined` ⇒ every JWT-only
 * install ran with the API unauthenticated).
 *
 * Two rules, enforced over the whole gateway source:
 *  1. Every `@Optional()` constructor param carries an explicit `@Inject(...)`
 *     — optional resolution must name its token, never lean on metadata.
 *  2. A name referenced in `@Inject(Name)` must not be a type-only import —
 *     `@Inject` needs the runtime value, or the token is `undefined`.
 */

const SRC_ROOT = __dirname;

/** Blank out comments + string literals (preserving line breaks) so the rules
 *  only ever match real code — prose like "the `@Optional()` param" must not trip. */
function stripCommentsAndStrings(source: string): string {
  return source.replace(
    // block comments | line comments | template/single/double-quoted strings
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\[\s\S]|[^\\`])*`|'(?:\\.|[^\\'\n])*'|"(?:\\.|[^\\"\n])*"/g,
    (m) => m.replace(/[^\n]/g, ' '),
  );
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'migrations') continue;
      walk(full, out);
    } else if (
      full.endsWith('.ts') &&
      !full.endsWith('.test.ts') &&
      !full.endsWith('.spec.ts') &&
      !full.endsWith('.d.ts')
    ) {
      out.push(full);
    }
  }
  return out;
}

describe('DI hygiene — explicit injection tokens', () => {
  const files = walk(SRC_ROOT);

  it('every @Optional() pairs with an explicit @Inject(...)', () => {
    const violations: string[] = [];
    for (const file of files) {
      const source = stripCommentsAndStrings(readFileSync(file, 'utf8'));
      // Each @Optional() must be immediately followed (modulo whitespace /
      // newlines) by @Inject( — i.e. the token is named, not metadata-derived.
      const optionals = source.matchAll(/@Optional\(\)(?!\s*@Inject\()/g);
      for (const match of optionals) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push(`${file.replace(SRC_ROOT, 'src')}:${line}`);
      }
    }
    expect(violations, `@Optional() without an explicit @Inject at:\n${violations.join('\n')}`).toEqual([]);
  });

  it('names passed to @Inject(...) are value imports, never import type', () => {
    const violations: string[] = [];
    for (const file of files) {
      const source = stripCommentsAndStrings(readFileSync(file, 'utf8'));
      // Collect names brought in via `import type { A, B } from ...`.
      const typeOnly = new Set<string>();
      for (const m of source.matchAll(/import type \{([^}]+)\}/g)) {
        for (const raw of m[1]!.split(',')) {
          const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
          if (name) typeOnly.add(name);
        }
      }
      if (typeOnly.size === 0) continue;
      // Any @Inject(Name) using one of them has an undefined runtime token.
      for (const m of source.matchAll(/@Inject\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) {
        if (typeOnly.has(m[1]!)) {
          const line = source.slice(0, m.index).split('\n').length;
          violations.push(`${file.replace(SRC_ROOT, 'src')}:${line} — @Inject(${m[1]}) but "${m[1]}" is import type`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
