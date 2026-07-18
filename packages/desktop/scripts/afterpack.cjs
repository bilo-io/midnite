'use strict';

const { readdirSync, statSync, existsSync, unlinkSync, chmodSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

/**
 * electron-builder afterPack hook. node-pty ships a `spawn-helper` executable
 * that can lose its +x bit when copied into the packaged app (the repo's
 * scripts/fix-node-pty.cjs only runs on `pnpm install`, not on user machines).
 * Without +x, opening a terminal session fails with `posix_spawnp failed`.
 * Re-assert the bit on every spawn-helper inside the build output.
 */
exports.default = async function afterPack(context) {
  const root = context.appOutDir;
  const helpers = [];
  walk(root, (file) => {
    if (file.endsWith('spawn-helper')) helpers.push(file);
  });
  for (const helper of helpers) {
    try {
      chmodSync(helper, 0o755);
    } catch {
      // best-effort
    }
  }
   
  console.log(`[afterPack] ensured +x on ${helpers.length} node-pty spawn-helper(s)`);

  // Prune dangling symlinks before signing. `pnpm deploy` leaves a
  // self-referential `.pnpm/node_modules/@midnite/gateway` symlink pointing at
  // the workspace package, which isn't part of the deployed tree — so it's
  // broken inside the bundle. It's unused at runtime (the gateway runs from
  // Resources/gateway/dist), but `codesign --deep` fails on it with
  // "No such file or directory", producing an invalid signature that Gatekeeper
  // rejects. Remove every broken symlink so the signature over the bundle is valid.
  const broken = [];
  walk(root, () => {}, (link) => {
    if (!existsSync(link)) broken.push(link);
  });
  for (const link of broken) {
    try {
      unlinkSync(link);
    } catch {
      // best-effort
    }
  }
  if (broken.length) console.log(`[afterPack] pruned ${broken.length} dangling symlink(s)`);

  // Ad-hoc code-sign the whole .app on macOS. electron-builder.yml sets
  // `identity: null` (no Developer ID cert), which leaves Electron's own
  // signature in place but invalidates it once our extraResources are copied in
  // ("code has no resources but signature indicates they must be present"),
  // so Gatekeeper refuses to launch. A `--force --deep --sign -` ad-hoc
  // signature over the final, resource-complete bundle is valid and lets the
  // app run locally (right-click → Open / after clearing quarantine). This
  // runs before the .dmg is built, so the shipped installer carries the fix.
  if (context.electronPlatformName === 'darwin') {
    const appName = `${context.packager.appInfo.productFilename}.app`;
    const appPath = join(root, appName);
    try {
      execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
        stdio: 'inherit',
      });
      console.log(`[afterPack] ad-hoc signed ${appName}`);
    } catch (err) {
      console.warn(`[afterPack] ad-hoc codesign failed: ${err.message}`);
    }
  }
};

function walk(dir, onFile, onLink) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    let isDir = entry.isDirectory();
    if (entry.isSymbolicLink()) {
      if (onLink) onLink(full);
      try {
        isDir = statSync(full).isDirectory();
      } catch {
        continue;
      }
    }
    if (isDir) walk(full, onFile, onLink);
    else onFile(full);
  }
}
