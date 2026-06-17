'use strict';

const { readdirSync, statSync, chmodSync } = require('node:fs');
const { join } = require('node:path');

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
};

function walk(dir, onFile) {
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
      try {
        isDir = statSync(full).isDirectory();
      } catch {
        continue;
      }
    }
    if (isDir) walk(full, onFile);
    else onFile(full);
  }
}
