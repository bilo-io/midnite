'use strict';

// node-pty ships prebuilt `spawn-helper` binaries (macOS) whose executable bit
// is dropped when pnpm extracts the tarball. Without +x, `pty.fork()` fails at
// runtime with "posix_spawnp failed". Restore it after every install. No-op on
// platforms that build node-pty from source (e.g. Linux CI, which has no
// prebuild) or when node-pty isn't present.

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const pnpmStore = path.join(repoRoot, 'node_modules', '.pnpm');

function restoreHelpers(nodePtyDir) {
  const prebuilds = path.join(nodePtyDir, 'prebuilds');
  if (!fs.existsSync(prebuilds)) return;
  for (const arch of fs.readdirSync(prebuilds)) {
    const helper = path.join(prebuilds, arch, 'spawn-helper');
    try {
      if (fs.existsSync(helper)) fs.chmodSync(helper, 0o755);
    } catch {
      // best-effort; ignore unwritable / missing helpers
    }
  }
}

try {
  if (!fs.existsSync(pnpmStore)) process.exit(0);
  for (const entry of fs.readdirSync(pnpmStore)) {
    if (entry.startsWith('node-pty@')) {
      restoreHelpers(path.join(pnpmStore, entry, 'node_modules', 'node-pty'));
    }
  }
} catch {
  // nothing to fix — ignore
}
