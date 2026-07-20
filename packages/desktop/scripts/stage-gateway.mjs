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
import { rmSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(here, '..');
const repoRoot = resolve(desktopDir, '../..');
const staging = join(desktopDir, 'build-staging', 'gateway');
const cliStaging = join(desktopDir, 'build-staging', 'cli');
const cliDist = resolve(repoRoot, 'packages', 'cli', 'dist', 'index.js');
const cliPkgJson = resolve(repoRoot, 'packages', 'cli', 'package.json');
const webOut = resolve(repoRoot, 'packages', 'web', 'out');
const webStaging = join(desktopDir, 'build-staging', 'web');
const devtoolsStub = join(here, 'stubs', 'react-devtools-core.mjs');

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

// 2a. Bundle the Electron preload into a self-contained file (Phase 77). The preload
//     runs in a *sandboxed* renderer context whose loader (`preloadRequire`) can't
//     resolve relative sibling modules — so `tsc`'s `require("../updates/update-state")`
//     throws "module not found" at load, the preload never runs, and
//     `window.__NEXT_PUBLIC_GATEWAY_URL` is never injected → the web silently falls back
//     to localhost:7777 (the real cause of "connects only to localhost"). esbuild-bundle
//     it in place so the only remaining require is `electron` (which the sandbox allows),
//     keeping the sandbox on. `dist/preload/index.js` is packaged into the asar as-is, so
//     overwriting it here (after `tsc`, before packaging) is enough.
const preloadEntry = join(desktopDir, 'dist', 'preload', 'index.js');
if (!existsSync(preloadEntry)) {
  throw new Error(`preload build not found at ${preloadEntry}. Run \`moon run desktop:build\` first.`);
}
await esbuild.build({
  entryPoints: [preloadEntry],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: preloadEntry,
  allowOverwrite: true,
  external: ['electron'],
  logLevel: 'error',
});

// 2b. Stage the bundled midnite CLI (Phase 77). The desktop ships `midnite` so a
//     downloaded app is a complete install — one binary that IS the gateway and
//     carries the CLI. Rather than `pnpm deploy` (which drags the whole @midnite/gateway
//     closure — nest/fastify/drizzle — in twice, ~220MB), esbuild-bundle the CLI into a
//     single ~3MB file. The `serve` command's lazy `import('@midnite/gateway/bootstrap')`
//     is kept external (serve is redundant here — the app IS the gateway), and ink's
//     optional `react-devtools-core` is aliased to a no-op stub. Layout mirrors the
//     source (dist/index.mjs + package.json) so the CLI's getVersion() — which reads
//     `../../package.json` — resolves the real version.
if (!existsSync(cliDist)) {
  throw new Error(
    `CLI build not found at ${cliDist}. Run \`moon run cli:build\` first ` +
      '(install-local does this before staging).',
  );
}
if (existsSync(cliStaging)) rmSync(cliStaging, { recursive: true, force: true });
mkdirSync(join(cliStaging, 'dist'), { recursive: true });
const cliVersion = require(cliPkgJson).version;
await esbuild.build({
  entryPoints: [cliDist],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: join(cliStaging, 'dist', 'index.mjs'),
  external: ['@midnite/gateway', '@midnite/gateway/bootstrap', 'better-sqlite3', 'node-pty'],
  alias: { 'react-devtools-core': devtoolsStub },
  // Bake the version in — a single-file bundle can't read package.json via `../..`.
  define: { __MIDNITE_CLI_VERSION__: JSON.stringify(cliVersion) },
  logLevel: 'error',
  // ESM output that still `require()`s CJS deps needs createRequire injected.
  banner: { js: "import{createRequire as ___cr}from'module';const require=___cr(import.meta.url);" },
});
cpSync(cliPkgJson, join(cliStaging, 'package.json'));

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
    `\nStaged CLI (HTTP client) at ${cliStaging}` +
    `\nStaged web static export at ${webStaging}.`,
);
