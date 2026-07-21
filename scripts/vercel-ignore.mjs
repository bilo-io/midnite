#!/usr/bin/env node
// Vercel "Ignored Build Step" for the midnite monorepo (Phase 78, Theme A).
//
// Vercel runs this once per candidate deploy. Its EXIT CODE decides the build:
//   exit 0  → SKIP the build (ignore this deploy)
//   exit 1  → PROCEED with the build
//
// Two things are cut here:
//   1. Previews — only the production branch deploys; any non-production
//      environment is skipped (we ship no feature-branch previews).
//   2. Untouched apps — an app only deploys when its own dependency SUBTREE
//      changed, so a docs-only change never rebuilds web (and vice-versa).
//
// moon is the affected-oracle for GitHub Actions, but it isn't in Vercel's
// build image; here we use a thin `git diff` over each app's subtree instead.
// The subtree lists MUST mirror the package's `moon.yml` dependsOn (+ itself);
// a drift-guard test (scripts consumer in packages/shared) pins them.

import { execFileSync } from 'node:child_process';

/**
 * Each app's build-relevant path prefixes: the package itself plus its
 * transitive in-repo dependencies (mirrors moon.yml `dependsOn`).
 *   web  → shared + ui + shell (shell itself pulls shared + ui)
 *   docs → ui
 */
export const SUBTREES = {
  web: ['packages/web/', 'packages/shared/', 'packages/ui/', 'packages/shell/'],
  docs: ['packages/docs/', 'packages/ui/'],
};

/**
 * Root files whose change can invalidate any app build (a dependency bump or a
 * workspace-topology change), so they force a build regardless of subtree.
 * Kept deliberately narrow — the lockfile is the real dependency signal.
 */
export const ALWAYS_BUILD = ['pnpm-lock.yaml', 'pnpm-workspace.yaml'];

export const PRODUCTION_BRANCH = 'main';

/**
 * Pure decision: should this app build?
 *
 * @param {object} o
 * @param {'web'|'docs'} o.app                 which Vercel project
 * @param {string} [o.env]                     VERCEL_ENV ('production'|'preview')
 * @param {string} [o.ref]                     VERCEL_GIT_COMMIT_REF (branch)
 * @param {string[]|null} o.changedFiles       repo-relative paths, or null if undiffable
 * @param {string} [o.productionBranch]        defaults to 'main'
 * @returns {{ build: boolean, reason: string }}
 */
export function decideVercelBuild({
  app,
  env,
  ref,
  changedFiles,
  productionBranch = PRODUCTION_BRANCH,
}) {
  const subtree = SUBTREES[app];
  if (!subtree) {
    // Unknown app → fail-open (build) rather than silently never deploy.
    return { build: true, reason: `fail-open: unknown app "${app}"` };
  }

  // 1. Previews off — only the production environment/branch deploys.
  const isProduction = env ? env === 'production' : ref === productionBranch || ref == null;
  if (!isProduction) {
    return { build: false, reason: `preview skipped (env=${env ?? 'n/a'}, ref=${ref ?? 'n/a'})` };
  }

  // 2. No diff available (first commit, shallow clone) → fail-open.
  if (changedFiles == null) {
    return { build: true, reason: 'fail-open: no diff available' };
  }

  // 3. A dependency/workspace change forces a build.
  const forced = changedFiles.find((f) => ALWAYS_BUILD.includes(f));
  if (forced) {
    return { build: true, reason: `forced by ${forced}` };
  }

  // 4. Build iff a changed file falls inside this app's subtree.
  const hit = changedFiles.find((f) => subtree.some((p) => f.startsWith(p)));
  if (hit) {
    return { build: true, reason: `${app} subtree changed (${hit})` };
  }

  return { build: false, reason: `no changes in ${app} subtree` };
}

/**
 * Changed files between the previous and current commit, or null if it can't
 * be computed (so the caller fails open).
 */
export function gitChangedFiles(run = defaultGit) {
  try {
    const out = run(['diff', '--name-only', 'HEAD^', 'HEAD']);
    return out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    return null; // no HEAD^ (initial commit) / shallow clone → fail-open
  }
}

function defaultGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

// ── CLI entry ────────────────────────────────────────────────────────────────
// Usage: node scripts/vercel-ignore.mjs <web|docs>
function main() {
  const app = process.argv[2];
  const { build, reason } = decideVercelBuild({
    app,
    env: process.env.VERCEL_ENV,
    ref: process.env.VERCEL_GIT_COMMIT_REF,
    changedFiles: gitChangedFiles(),
  });
  // Log to stderr so it shows in the Vercel build log without polluting stdout.
  process.stderr.write(`[vercel-ignore:${app}] ${build ? 'BUILD' : 'SKIP'} — ${reason}\n`);
  // exit 1 = proceed with build, exit 0 = skip.
  process.exit(build ? 1 : 0);
}

// Run only as a CLI, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
