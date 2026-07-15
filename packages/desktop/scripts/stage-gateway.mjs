// Stage everything electron-builder's extraResources expect into build-staging/
// INSIDE packages/desktop (electron-builder 25.x rejects `from:` paths outside the
// app dir — see electron-builder.yml):
//   • build-staging/gateway — a flat, symlink-free production node_modules for the
//     gateway (pnpm deploy) with native deps (better-sqlite3, node-pty) rebuilt
//     against Electron's ABI, plus its dist/ + drizzle/.
//   • build-staging/web     — the Next.js static export (packages/web/out).
//
//   node packages/desktop/scripts/stage-gateway.mjs
//
// Prerequisites (run first): `moon run gateway:build web:build` so gateway/dist and
// web/out exist. macOS/real-machine only: it shells out to electron-rebuild, which
// needs the Electron binary installed. Run from the repo root (or anywhere — paths
// are resolved relative to this file).

import { execFileSync } from 'node:child_process';
import { rmSync, existsSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(here, '..');
const repoRoot = resolve(desktopDir, '../..');
const staging = join(desktopDir, 'build-staging', 'gateway');
const webOut = resolve(repoRoot, 'packages', 'web', 'out');
const webStaging = join(desktopDir, 'build-staging', 'web');

const require = createRequire(pathToFileURL(join(desktopDir, 'package.json')));
const electronVersion = require('electron/package.json').version;

// On Windows, pnpm is a .cmd shim — Node refuses to execFile it directly
// (EINVAL), so run through the shell there, which resolves pnpm.cmd on PATH.
const isWin = process.platform === 'win32';

function run(cmd, args, cwd) {

  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
}

// 1. Fresh, flat prod deps for the gateway (pnpm deploy resolves the closure
//    into a real directory with no symlinks).
if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
run('pnpm', ['--filter', '@midnite/gateway', 'deploy', '--prod', staging], repoRoot);

// 2. Rebuild the native deps in the staged tree for Electron's ABI.
for (const mod of ['better-sqlite3', 'node-pty']) {
  run(
    'pnpm',
    ['exec', 'electron-rebuild', '-m', staging, '-f', '-w', mod, '--version', electronVersion],
    desktopDir,
  );
}

// 3. Stage the web static export. electron-builder reads it from build-staging/web
//    (a sibling ../web/out path is rejected as outside the app dir), so copy it in.
if (!existsSync(webOut)) {
  throw new Error(
    `web static export not found at ${webOut}. Run \`moon run web:build\` first ` +
      '(next.config.mjs sets output: "export", which writes packages/web/out).',
  );
}
if (existsSync(webStaging)) rmSync(webStaging, { recursive: true, force: true });
cpSync(webOut, webStaging, { recursive: true });

console.log(
  `\nStaged gateway prod deps at ${staging} (electron ${electronVersion})` +
    `\nStaged web static export at ${webStaging}.`,
);
