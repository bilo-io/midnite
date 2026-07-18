#!/usr/bin/env node
// emit-version-manifest: write packages/web/public/version.json — the runtime
// "latest version" manifest a running client polls (Phase 71 Theme G). The
// RELEASE FLOW is the single writer: `/release-complete` runs this in the
// `chore(release)` commit so the manifest bumps atomically with the version, and
// `version-check` guards against a stale manifest.
//
// Self-contained on purpose (no @midnite/* imports): the sibling `version-check`
// guard runs in `moon ci` before any build, and keeping both scripts import-free
// keeps them runnable without built output. The manifest SHAPE is the contract
// `VersionManifestSchema` in packages/shared/src/update.ts — keep the two in
// agreement (a shared test parses this script's builder output against it).
//
// `version` tracks the WEB package's version (that's what the web build inlines as
// NEXT_PUBLIC_APP_VERSION and compares against), not the root/other packages.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_PACKAGE = path.join(repoRoot, 'packages/web/package.json');
const MANIFEST_OUT = path.join(repoRoot, 'packages/web/public/version.json');

/** The public downloads repo whose Releases the version link points at. */
const RELEASES_REPO = 'bilo-io/midnite-app';

/**
 * Assemble the version manifest object. Pure — no I/O — so a shared test can parse
 * it against `VersionManifestSchema`. `minSupported` is intentionally omitted (the
 * force-update floor is set by hand for a hard cutover — Phase 71 Theme H), and
 * `channel` defaults to `stable` (beta selection is also Theme H).
 *
 * @param {{ version: string, channel?: string, releasedAt?: string, notesUrl?: string }} input
 */
export function buildManifest({ version, channel = 'stable', releasedAt, notesUrl }) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`emit-version-manifest: invalid version "${version}" (expected MAJOR.MINOR.PATCH)`);
  }
  return {
    version,
    channel,
    releasedAt: releasedAt ?? new Date().toISOString(),
    notesUrl: notesUrl ?? `https://github.com/${RELEASES_REPO}/releases/tag/v${version}`,
  };
}

/** Read the web package's `version`. */
async function readWebVersion() {
  const raw = await readFile(WEB_PACKAGE, 'utf8');
  const json = JSON.parse(raw);
  if (typeof json.version !== 'string') {
    throw new Error('packages/web/package.json has no string "version" field');
  }
  return json.version;
}

async function main() {
  const version = await readWebVersion();
  const manifest = buildManifest({ version });
  await writeFile(MANIFEST_OUT, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`emit-version-manifest OK: wrote ${path.relative(repoRoot, MANIFEST_OUT)} @ ${version}`);
}

// Run only when invoked directly (`node scripts/emit-version-manifest.mjs`), so the
// pure `buildManifest` can be imported by tests without executing the writer.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`emit-version-manifest errored: ${err.message}`);
    process.exit(1);
  });
}
