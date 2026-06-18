// Stage a flat, symlink-free production node_modules for the gateway and rebuild
// its native deps (better-sqlite3, node-pty) against Electron's ABI — the layout
// electron-builder's extraResources expects. macOS/real-machine only: it shells
// out to electron-rebuild, which needs the Electron binary installed.
//
//   node packages/desktop/scripts/stage-gateway.mjs
//
// Run from the repo root (or anywhere — paths are resolved relative to this file).

import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(here, '..');
const repoRoot = resolve(desktopDir, '../..');
const staging = join(desktopDir, 'build-staging', 'gateway');

const require = createRequire(pathToFileURL(join(desktopDir, 'package.json')));
const electronVersion = require('electron/package.json').version;

// On Windows the launcher is pnpm.cmd; execFileSync won't resolve a bare `pnpm`.
const PNPM = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(cmd, args, cwd) {

  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

// 1. Fresh, flat prod deps for the gateway (pnpm deploy resolves the closure
//    into a real directory with no symlinks).
if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
run(PNPM, ['--filter', '@midnite/gateway', 'deploy', '--prod', staging], repoRoot);

// 2. Rebuild the native deps in the staged tree for Electron's ABI.
for (const mod of ['better-sqlite3', 'node-pty']) {
  run(
    PNPM,
    ['exec', 'electron-rebuild', '-m', staging, '-f', '-w', mod, '--version', electronVersion],
    desktopDir,
  );
}

 
console.log(`\nStaged gateway prod deps at ${staging} (electron ${electronVersion}).`);
