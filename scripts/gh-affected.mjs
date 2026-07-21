#!/usr/bin/env node
// Affected-package detection for GitHub Actions (Phase 78 Theme B).
//
// moon's affected graph is the single oracle: `moon query projects --affected`
// (reading MOON_BASE / MOON_HEAD from env) already knows the shared→web /
// ui→shell→web edges, so a shared change correctly marks web affected.
//
// Emits one boolean per package to $GITHUB_OUTPUT, plus convenience groups the
// workflows gate on. FAIL-OPEN: if the diff base can't be resolved or moon
// errors, every output is 'true' so no needed check is ever silently skipped.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

// Every real in-repo package (excludes the synthetic `root` project).
export const PACKAGES = [
  'shared', 'ui', 'shell', 'web', 'docs', 'admin', 'site', 'gateway', 'cli', 'desktop',
];

// Packages whose change should run the visual/e2e/Storybook jobs.
export const WEB_VISUAL = ['web', 'ui', 'shared', 'shell'];

/**
 * Pure mapping of an affected-id set → the workflow outputs.
 * @param {{ affectedIds: string[], failOpen: boolean }} o
 * @returns {Record<string, 'true'|'false'>}
 */
export function computeAffected({ affectedIds, failOpen }) {
  const affected = new Set(affectedIds);
  const on = (id) => (failOpen || affected.has(id) ? 'true' : 'false');

  const out = {};
  for (const p of PACKAGES) out[p] = on(p);

  // `code` gates the blocking `moon ci` job — any package (or fail-open).
  out.code = failOpen || PACKAGES.some((p) => affected.has(p)) ? 'true' : 'false';
  // `webVisual` gates e2e / screenshots / Storybook preview.
  out.webVisual = failOpen || WEB_VISUAL.some((p) => affected.has(p)) ? 'true' : 'false';
  out.failOpen = failOpen ? 'true' : 'false';
  return out;
}

/** Query moon for affected project ids; throws if moon errors. */
export function queryAffected(run = defaultMoon) {
  // `moon query` emits JSON by default; passing `--json` after `--affected` is
  // misparsed as the affected value, so we don't.
  const raw = run(['query', 'projects', '--affected']);
  const parsed = JSON.parse(raw);
  const ids = (parsed.projects ?? []).map((p) => p.id);
  // A change to workspace-level config surfaces as the `root` project → treat as
  // fail-open (rebuild everything) rather than trying to map it to a package.
  return { ids, rootTouched: ids.includes('root') };
}

function defaultMoon(args) {
  return execFileSync('moon', args, { encoding: 'utf8' });
}

// ── CLI entry ────────────────────────────────────────────────────────────────
function main() {
  // The workflow sets this when it can't resolve a diff base (first push,
  // force-push, shallow clone) — force fail-open without even asking moon.
  let failOpen = process.env.AFFECTED_FAIL_OPEN === '1';
  let ids = [];
  if (!failOpen) {
    try {
      const res = queryAffected();
      ids = res.ids;
      if (res.rootTouched) failOpen = true;
    } catch (err) {
      process.stderr.write(`[gh-affected] moon query failed → fail-open: ${err}\n`);
      failOpen = true;
    }
  }

  const outputs = computeAffected({ affectedIds: ids, failOpen });
  const lines = Object.entries(outputs).map(([k, v]) => `${k}=${v}`);
  process.stderr.write(`[gh-affected] ${failOpen ? '(fail-open) ' : ''}${lines.join(' ')}\n`);

  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile) appendFileSync(outFile, lines.join('\n') + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
