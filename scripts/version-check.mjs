#!/usr/bin/env node
// version-check: assert the lockstep invariant — the root package.json and every
// packages/*/package.json share one MAJOR.MINOR (PATCH may differ per package).
// A hand-edit that breaks lockstep fails CI here with a clear, named message.
//
// Self-contained on purpose: no @midnite/* imports. It runs in `moon ci` before
// (and independently of) any build, so it must not depend on built output. The
// bump *math* lives in packages/shared/src/version.ts; this script is just the
// repo-wide invariant guard. Keep the two in agreement.

import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Read the `name` + `version` from a package.json, or throw with the path. */
async function readPackage(pkgPath) {
  let raw;
  try {
    raw = await readFile(pkgPath, 'utf8');
  } catch (err) {
    throw new Error(`cannot read ${path.relative(repoRoot, pkgPath)}`, { cause: err });
  }
  const json = JSON.parse(raw);
  if (typeof json.version !== 'string') {
    throw new Error(`${path.relative(repoRoot, pkgPath)} has no string "version" field`);
  }
  return { path: pkgPath, name: json.name ?? path.relative(repoRoot, pkgPath), version: json.version };
}

/** `MAJOR.MINOR` prefix of a semver, validating the shape. */
function majorMinor(version, name) {
  const parts = version.split('.');
  if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p))) {
    throw new Error(`${name}: invalid version "${version}" (expected MAJOR.MINOR.PATCH)`);
  }
  return `${parts[0]}.${parts[1]}`;
}

async function main() {
  const packagesDir = path.join(repoRoot, 'packages');
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const pkgPaths = [
    path.join(repoRoot, 'package.json'),
    ...entries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(packagesDir, e.name, 'package.json')),
  ];

  const packages = await Promise.all(pkgPaths.map(readPackage));

  // Group packages by their MAJOR.MINOR prefix; lockstep means exactly one group.
  const groups = new Map();
  for (const pkg of packages) {
    const prefix = majorMinor(pkg.version, pkg.name);
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(pkg);
  }

  if (groups.size <= 1) {
    const prefix = groups.size === 1 ? [...groups.keys()][0] : 'n/a';
    console.log(`version-check OK: ${packages.length} packages in lockstep at ${prefix}.x`);
    return;
  }

  // Violation: report every diverging MAJOR.MINOR group and its packages.
  const expected = mostCommonPrefix(groups);
  console.error('version-check FAILED: packages do not share one MAJOR.MINOR (lockstep broken).');
  for (const [prefix, pkgs] of [...groups.entries()].sort()) {
    const tag = prefix === expected ? '' : '  <-- diverges';
    console.error(`  ${prefix}.x: ${pkgs.map((p) => `${p.name}@${p.version}`).join(', ')}${tag}`);
  }
  process.exitCode = 1;
}

/** The MAJOR.MINOR prefix backing the most packages (the presumed intended one). */
function mostCommonPrefix(groups) {
  let best = null;
  let bestCount = -1;
  for (const [prefix, pkgs] of groups) {
    if (pkgs.length > bestCount) {
      best = prefix;
      bestCount = pkgs.length;
    }
  }
  return best;
}

main().catch((err) => {
  console.error(`version-check errored: ${err.message}`);
  if (err.cause) console.error(err.cause);
  process.exit(1);
});
