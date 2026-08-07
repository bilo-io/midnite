// Rebuild the gateway's native deps (better-sqlite3, node-pty) against Electron's
// ABI, INSIDE the staged tree only. Used by scripts/stage-gateway.mjs (step 2) and
// runnable standalone (`pnpm --filter @midnite/desktop run rebuild:native`) once
// `run stage` has produced build-staging/gateway.
//
// Why the programmatic API and not `pnpm exec electron-rebuild`:
//
//   The CLI has no way to scope the module search. `-m <dir>` only sets the *start*
//   of the walk; the bound is `projectRootPath`, which the CLI derives by walking up
//   for a lockfile (cli.js: `getProjectRootPath(process.cwd())`) — landing on the REPO
//   ROOT. @electron/rebuild then collects every node_modules between the staged tree
//   and the repo root, recurses into pnpm's hidden `.pnpm/node_modules` hoist dir, and
//   finds the WORKSPACE better-sqlite3/node-pty — which it duly rebuilt for Electron
//   ABI 130 on every single stage run, contaminating the gateway's Node-ABI (127)
//   copies. The tell was a `build/Release/.forge-meta` in the workspace store; the
//   `ensure-native-abi` guard caught it each time and self-healed, which is why this
//   only ever showed up as noise rather than a broken build. See docs/NATIVE-MODULES.md.
//
//   `projectRootPath` IS a first-class RebuildOptions field — it just has no CLI flag.
//   Pinning it to the staged tree stops the ancestor walk dead.
//
// Note `-o/onlyModules` alone would NOT have fixed it: the walker matches by module
// basename, which is identical for the workspace and staged copies. Only bounding the
// walk stops the workspace copy from being enumerated in the first place.

import { existsSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { rebuild } from '@electron/rebuild';

export const NATIVE_MODULES = ['better-sqlite3', 'node-pty'];

/**
 * Delete symlinks under the staged tree that resolve OUTSIDE it, and report them.
 *
 * `projectRootPath` bounds where the module walk *starts climbing* from, but it does
 * not stop the walk from being led out through a symlink: @electron/rebuild resolves
 * realpaths and then recurses into `<realpath>/node_modules`. `pnpm deploy` leaves
 * exactly one such door open — `.pnpm/node_modules/@midnite/gateway`, a self-reference
 * back to the source package — and through it the walk reaches the workspace's
 * better-sqlite3/node-pty and rebuilds them for Electron. Bounding alone is therefore
 * not enough; the tree has to genuinely be a closed graph.
 *
 * These links are also junk in the shipped app: they point at an absolute path in the
 * build machine's home directory, so they are already dead on a user's disk.
 *
 * @param {string} staging
 */
export function pruneEscapingSymlinks(staging) {
  const pruned = [];
  const walk = (dir, depth) => {
    if (depth > 8) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable dir — nothing to prune
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        let real;
        try {
          real = realpathSync(full);
        } catch {
          continue; // dangling link: harmless, the walker skips these too
        }
        if (!real.startsWith(staging + sep)) {
          rmSync(full, { force: true });
          pruned.push(relative(staging, full));
        }
      } else if (entry.isDirectory()) {
        walk(full, depth + 1);
      }
    }
  };
  walk(join(staging, 'node_modules'), 0);
  return pruned;
}

/**
 * @param {{ staging: string, electronVersion: string, arch?: string }} opts
 */
export async function rebuildStagedNatives({ staging, electronVersion, arch = process.arch }) {
  const pruned = pruneEscapingSymlinks(staging);
  if (pruned.length > 0) {
    console.log(`pruned ${pruned.length} symlink(s) escaping the staged tree: ${pruned.join(', ')}`);
  }

  process.stdout.write(
    `rebuilding ${NATIVE_MODULES.join(', ')} for electron ${electronVersion} (${arch})... `,
  );

  const found = [];
  const task = rebuild({
    buildPath: staging,
    // The bound. Without it the walk climbs out of build-staging into the workspace.
    projectRootPath: staging,
    electronVersion,
    arch,
    force: true,
    // One pass for both modules. `-w` (extraModules) is not a filter — it only ADDS to
    // an already-complete prod-dep set, so the old two-invocation loop rebuilt both
    // modules twice, including two full node-gyp compiles of node-pty.
    onlyModules: NATIVE_MODULES,
  });
  // 'module-found' fires for every module the walker selected that has a binding.gyp.
  // ('start' is emitted synchronously inside rebuild(), before it returns, so a
  // listener attached here could never observe it. 'module-done' is skipped on the
  // prebuild-install fast path, so it can't be used for the assertion below.)
  task.lifecycle.on('module-found', (name) => found.push(name));
  await task;

  console.log(`done (${found.join(', ') || 'none'})`);

  // Bounding the walk trades a loud failure for a silent one: if a future pnpm layout
  // change moved these modules out of the staged tree, we'd rebuild nothing and ship
  // Node-ABI binaries in the .app that crash on launch. Fail here instead.
  const missed = NATIVE_MODULES.filter((m) => !found.includes(m));
  if (missed.length > 0) {
    throw new Error(
      `electron-rebuild found no [${missed.join(', ')}] under ${staging}. ` +
        'The staged tree layout changed — inspect build-staging/gateway/node_modules ' +
        'before shipping, or the packaged app will crash on boot.',
    );
  }
}

// CLI entry: resolve the same staging dir + Electron version stage-gateway.mjs uses.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const desktopDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const staging = join(desktopDir, 'build-staging', 'gateway');
  if (!existsSync(staging)) {
    throw new Error(
      `${staging} does not exist. Run \`pnpm --filter @midnite/desktop run stage\` first.`,
    );
  }
  const require = createRequire(pathToFileURL(join(desktopDir, 'package.json')));
  await rebuildStagedNatives({
    staging,
    electronVersion: require('electron/package.json').version,
  });
}
