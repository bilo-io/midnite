// Preflight: verify the gateway's native modules (better-sqlite3, node-pty)
// load under the CURRENT Node ABI, and self-heal with a targeted rebuild when
// they don't. Wired as the `gateway:ensure-native` moon task, which `dev` and
// `test` depend on, and reused by the desktop packaging flow
// (packages/desktop/scripts/stage-gateway.mjs) to catch contamination at the
// source. See docs/NATIVE-MODULES.md for the full story.
//
// Why this exists: the desktop app electron-rebuilds these modules for
// Electron's ABI (Electron 33 = ABI 130). If that build ever leaks into the
// workspace node_modules (historically via pnpm's global side-effects cache,
// now disabled in .npmrc), the gateway crashes on boot with
// "compiled against a different Node.js version (ABI 130 vs 127)".
//
//   node packages/gateway/scripts/ensure-native-abi.mjs           # check + heal
//   node packages/gateway/scripts/ensure-native-abi.mjs --check   # check only, no heal
//
// Exit codes: 0 = modules load (possibly after healing); 1 = still broken.

import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const gatewayDir = resolve(here, '..');
const repoRoot = resolve(gatewayDir, '../..');
const checkOnly = process.argv.includes('--check');

// Each probe must actually dlopen the native binding: better-sqlite3 defers it
// to the first Database() (a bare require passes even with a wrong-ABI binary);
// node-pty dlopens at require time.
const MODULES = [
  { name: 'better-sqlite3', probe: "new (require('better-sqlite3'))(':memory:')" },
  { name: 'node-pty', probe: "require('node-pty')" },
];

// On Windows, pnpm is a .cmd shim — Node refuses to execFile it directly
// (EINVAL), so run through the shell there, which resolves pnpm.cmd on PATH.
const isWin = process.platform === 'win32';

// Probe each module in a child process: a failed dlopen must not leave state in
// this process, and `node -e` resolves node_modules from cwd, so pointing cwd
// at the gateway package checks exactly what the gateway will load.
function brokenModules() {
  return MODULES.filter(({ probe }) => {
    const res = spawnSync(process.execPath, ['-e', probe], {
      cwd: gatewayDir,
      encoding: 'utf8',
    });
    if (res.status === 0) return false;
    process.stderr.write(res.stderr ?? '');
    return true;
  });
}

const names = (mods) => mods.map((m) => m.name).join(', ');

let broken = brokenModules();
if (broken.length === 0) process.exit(0);

const abi = process.versions.modules;
console.error(
  `\n⚠ native module ABI mismatch: [${names(broken)}] cannot load under ` +
    `Node ${process.version} (ABI ${abi}).\n` +
    '  Most likely cause: an Electron (desktop) rebuild contaminated the Node build\n' +
    '  (Electron 33 = ABI 130). See docs/NATIVE-MODULES.md.\n',
);

if (checkOnly) process.exit(1);

const moduleNames = MODULES.map((m) => m.name);
console.error(`  Self-healing: pnpm rebuild -r ${moduleNames.join(' ')} ...\n`);
execFileSync('pnpm', ['rebuild', '-r', ...moduleNames], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: isWin,
});

broken = brokenModules();
if (broken.length > 0) {
  console.error(
    `\n✗ [${names(broken)}] still fail to load after a rebuild. ` +
      'Check that the running Node matches .prototools, then see docs/NATIVE-MODULES.md.',
  );
  process.exit(1);
}

console.error('✓ native modules rebuilt for the current Node ABI.\n');
