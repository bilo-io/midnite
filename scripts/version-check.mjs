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

/**
 * Assert the published web manifest (`packages/web/public/version.json`, Phase 71
 * Theme G) is fresh: it must be well-formed and its `version` must equal the web
 * package's version. The release flow (`/release-complete` → `emit-version-manifest`)
 * bumps both together, so a mismatch here means the manifest was left stale — a
 * running client would poll a version that never ships. Pure + import-free (mirrors
 * `VersionManifestSchema`'s constraints) so it runs in `moon ci` before any build.
 *
 * @param {unknown} manifest parsed `version.json`
 * @param {string} webVersion `packages/web/package.json` version
 * @returns {{ ok: boolean, message: string }}
 */
export function checkManifestFreshness(manifest, webVersion) {
  if (typeof manifest !== 'object' || manifest === null) {
    return { ok: false, message: 'version.json is not a JSON object' };
  }
  const { version, channel } = manifest;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    return { ok: false, message: `version.json "version" is invalid: ${JSON.stringify(version)}` };
  }
  if (channel !== undefined && channel !== 'stable' && channel !== 'beta') {
    return { ok: false, message: `version.json "channel" must be stable|beta, got ${JSON.stringify(channel)}` };
  }
  if (version !== webVersion) {
    return {
      ok: false,
      message: `version.json is stale: manifest ${version} ≠ @midnite/web ${webVersion} — run \`moon run root:emit-version-manifest\``,
    };
  }
  return { ok: true, message: `version.json fresh at ${version} (channel ${channel ?? 'stable'})` };
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
  let failed = false;

  // 1) Lockstep: group packages by MAJOR.MINOR prefix; lockstep = exactly one group.
  const groups = new Map();
  for (const pkg of packages) {
    const prefix = majorMinor(pkg.version, pkg.name);
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(pkg);
  }

  if (groups.size <= 1) {
    const prefix = groups.size === 1 ? [...groups.keys()][0] : 'n/a';
    console.log(`version-check OK: ${packages.length} packages in lockstep at ${prefix}.x`);
  } else {
    const expected = mostCommonPrefix(groups);
    console.error('version-check FAILED: packages do not share one MAJOR.MINOR (lockstep broken).');
    for (const [prefix, pkgs] of [...groups.entries()].sort()) {
      const tag = prefix === expected ? '' : '  <-- diverges';
      console.error(`  ${prefix}.x: ${pkgs.map((p) => `${p.name}@${p.version}`).join(', ')}${tag}`);
    }
    failed = true;
  }

  // 2) Manifest freshness: public/version.json must track the web package version.
  const webPkg = packages.find((p) => p.name === '@midnite/web');
  const manifestPath = path.join(repoRoot, 'packages/web/public/version.json');
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (err) {
    console.error(`version-check FAILED: cannot read packages/web/public/version.json — ${err.message}`);
    failed = true;
  }
  if (manifest !== undefined) {
    const result = checkManifestFreshness(manifest, webPkg?.version);
    if (result.ok) {
      console.log(`version-check OK: ${result.message}`);
    } else {
      console.error(`version-check FAILED: ${result.message}`);
      failed = true;
    }
  }

  if (failed) process.exitCode = 1;
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

// Run only when invoked directly, so tests can import `checkManifestFreshness`
// without executing the checker (which would read the repo + set exit codes).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`version-check errored: ${err.message}`);
    if (err.cause) console.error(err.cause);
    process.exit(1);
  });
}
