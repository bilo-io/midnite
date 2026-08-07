// Stage everything electron-builder's extraResources expect into build-staging/
// INSIDE packages/desktop (electron-builder 25.x rejects `from:` paths outside the
// app dir — see electron-builder.yml):
//   • build-staging/gateway — a self-contained production node_modules for the
//     gateway (pnpm deploy) with native deps (better-sqlite3, node-pty) rebuilt
//     against Electron's ABI, plus its dist/ + drizzle/.
//
//     NB this tree is NOT "flat, symlink-free" as this comment long claimed: pnpm
//     deploy builds an isolated `.pnpm` virtual store here and symlinks into it, and
//     it leaves one link pointing back OUT at the workspace
//     (`.pnpm/node_modules/@midnite/gateway`). Step 2 prunes any such escapee, which
//     is what actually makes the tree self-contained — see scripts/rebuild-native.mjs.
//   • build-staging/web     — the Next.js static export (packages/web/out).
//
//   node packages/desktop/scripts/stage-gateway.mjs
//
// Prerequisites (run first): `moon run gateway:build web:build` so gateway/dist and
// web/out exist. macOS/real-machine only: it shells out to electron-rebuild, which
// needs the Electron binary installed. Run from the repo root (or anywhere — paths
// are resolved relative to this file).

import { execFileSync, spawn } from 'node:child_process';
import { rmSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

import { rebuildStagedNatives } from './rebuild-native.mjs';

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

// The one warning we deliberately swallow: pnpm 9.15's deploy runs its bin-linking pass
// against a path it mis-resolved (see step 1a), so it reports ENOENT for every
// devDependency bin — browserslist, webpack, esbuild, vite, terser, jiti, yaml,
// playwright — that `--prod` correctly did not install. Eight lines of pure noise per
// stage describing work that was never supposed to happen. pnpm writes them to stdout.
const PNPM_PHANTOM_BIN_WARNING = /WARN\s+Failed to create bin at .*\bENOENT\b/;

// `pnpm deploy` with stdout filtered line-by-line. Everything that isn't the phantom-bin
// warning is passed through verbatim and in real time — this must never become a blanket
// silence, or a genuine pnpm failure would vanish with it.
async function runDeploy() {
  const args = ['--filter', '@midnite/gateway', 'deploy', '--prod', staging];
  console.log(`$ pnpm ${args.join(' ')}`);

  const child = spawn('pnpm', args, {
    cwd: repoRoot,
    shell: isWin,
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let suppressed = 0;
  lines.on('line', (line) => {
    if (PNPM_PHANTOM_BIN_WARNING.test(line)) suppressed += 1;
    else console.log(line);
  });

  const code = await new Promise((res, rej) => {
    child.on('error', rej);
    child.on('close', res);
  });
  if (code !== 0) throw new Error(`pnpm deploy exited ${code}`);
  if (suppressed > 0) {
    console.log(`  (suppressed ${suppressed} phantom pnpm bin-link warnings — see step 1a)`);
  }
}

// 1. Fresh prod deps for the gateway (pnpm deploy resolves the closure into a
//    self-contained directory).
if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
await runDeploy();

// 1a. pnpm 9.15's deploy mis-resolves its bin-link target: it re-joins the absolute
//     deploy path onto the FILTERED PROJECT dir, so alongside the correct
//     build-staging/gateway/node_modules/.bin it also writes a duplicate at
//       packages/gateway/packages/desktop/build-staging/gateway/node_modules/.bin
//     The staged tree is unaffected (verified: same 10 bins, correct targets), but the
//     stray copy is real, and because `pnpm deploy` copies the whole source package dir
//     the NEXT stage would drag it into the shipped payload. Remove it here.
//     Guarded on existence, so this becomes a no-op the day pnpm fixes the bug.
const deployBinLeak = join(repoRoot, 'packages', 'gateway', relative(repoRoot, staging));
if (existsSync(deployBinLeak)) {
  rmSync(join(repoRoot, 'packages', 'gateway', relative(repoRoot, staging).split(sep)[0]), {
    recursive: true,
    force: true,
  });
}

// 2. Rebuild the native deps in the staged tree for Electron's ABI. See
//    scripts/rebuild-native.mjs for why this is the API and not the electron-rebuild
//    CLI (short version: only the API can bound the walk to the staged tree, and the
//    CLI form silently rebuilt the WORKSPACE copies for Electron's ABI every run).
await rebuildStagedNatives({ staging, electronVersion });

// 2a. Guard: the Electron rebuild above must only ever touch the staged tree.
//     Historically its artifacts leaked into the WORKSPACE node_modules through
//     pnpm's global side-effects cache (hardlinked store files), breaking the
//     gateway under Node with "ABI 130 vs 127" days later — see
//     docs/NATIVE-MODULES.md. Verify the workspace copies still load under Node
//     right here at the source; the script self-heals (targeted pnpm rebuild)
//     and warns loudly, or fails the stage if it can't.
run('node', [join(repoRoot, 'packages', 'gateway', 'scripts', 'ensure-native-abi.mjs')], repoRoot);

// 2b. Bundle the Electron preload into a self-contained file (Phase 77). The preload
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

// 2c. Stage the bundled midnite CLI (Phase 77). The desktop ships `midnite` so a
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
