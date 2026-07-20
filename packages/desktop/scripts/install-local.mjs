// Build the desktop app from the CURRENT working tree and replace the installed
// /Applications/midnite.app with it — one command for the local build→install loop.
//
//   node packages/desktop/scripts/install-local.mjs
//   pnpm --filter @midnite/desktop run install:local   (same thing)
//
// macOS + Apple Silicon only (mirrors the release matrix — see electron-builder.yml).
// It chains the same steps the README's "Packaging" section documents, then copies
// electron-builder's unpacked app (build/mac-arm64/midnite.app) straight into
// /Applications — no dmg mount needed — after quitting any running instance.
//
// Steps:
//   1. build gateway dist + Electron main/preload (moon), then the web static
//      export (moon, with a tolerance for a known output-check flake — see below)
//   2. pnpm run stage    (flat gateway prod node_modules, rebuilt native deps, web/out)
//   3. pnpm run package  (electron-builder → build/mac-arm64/midnite.app + the dmgs)
//   4. quit → ditto into /Applications/midnite.app → de-quarantine

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(here, '..');
const repoRoot = resolve(desktopDir, '../..');

if (process.platform !== 'darwin') {
  console.error('install-local: macOS only (packages an Apple-Silicon .app into /Applications).');
  process.exit(1);
}

function run(cmd, args, cwd = repoRoot) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

// osascript/quit can exit non-zero when the app isn't running — swallow that.
function tryRun(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: 'ignore' });
  } catch {
    /* not running / not installed — fine */
  }
}

// 1. Build gateway dist, the Electron main/preload, and the CLI dist (esbuild-bundled
//    into the staged app by `pnpm run stage` — Phase 77).
run('moon', ['run', 'gateway:build', 'desktop:build', 'cli:build']);

// The web static export. On a CACHE MISS, moon's post-run output check flakes on
// Next's `output: export` `out/` glob and errors with `task_runner::missing_outputs`
// even though `out/` is written correctly (a cache HIT restores it and passes).
// Tolerate ONLY that: after moon errors, verify the real artifact — a genuine
// `next build` failure never emits out/index.html, so real breakage still aborts.
const webOutIndex = resolve(repoRoot, 'packages', 'web', 'out', 'index.html');
try {
  run('moon', ['run', 'web:build']);
} catch (err) {
  if (!existsSync(webOutIndex)) throw err;
  console.warn(
    "\n! web:build reported missing_outputs, but packages/web/out is present — " +
      'moon flakes its output check on the static export; continuing.',
  );
}

// 2. Stage gateway prod deps (pnpm deploy + electron-rebuild) + the web export.
run('pnpm', ['--filter', '@midnite/desktop', 'run', 'stage']);

// 3. Package — produces build/mac-arm64/midnite.app alongside the dmgs.
//    Call electron-builder directly (the `package` script) rather than
//    `moon run desktop:package`: the moon task declares web:build as a dep and
//    would re-trigger the flaky static-export output check (see step 1). Every
//    real input is already built + staged by now, so electron-builder needs no
//    moon graph — this is the README's "single OS locally" path.
run('pnpm', ['--filter', '@midnite/desktop', 'run', 'package']);

const built = join(desktopDir, 'build', 'mac-arm64', 'midnite.app');
if (!existsSync(built)) {
  console.error(`install-local: expected packaged app not found at ${built}`);
  process.exit(1);
}

// 4. Quit any running instance, then swap it into /Applications.
const installed = '/Applications/midnite.app';
console.log('\n$ quitting any running midnite instance');
tryRun('osascript', ['-e', 'quit app "midnite"']);

console.log(`$ replacing ${installed}`);
rmSync(installed, { recursive: true, force: true });
// Copy with `ditto`, NOT `cp -R`/cpSync: the .app embeds signed frameworks whose
// bundles use Versions/Current symlinks, and a plain recursive copy breaks the
// code seal ("unsealed contents present in the root directory of an embedded
// framework") → macOS SIGKILLs the app on launch with no output. ditto preserves
// the bundle structure + signature so the ad-hoc-signed local build still runs.
run('ditto', [built, installed]);

// Unsigned local build → strip the quarantine bit so Gatekeeper lets it launch.
tryRun('xattr', ['-dr', 'com.apple.quarantine', installed]);

// Symlink the bundled `midnite` CLI onto PATH so it's usable from the terminal.
// Best-effort: /usr/local/bin may need elevated perms — fall back to instructions.
const shim = join(installed, 'Contents', 'Resources', 'bin', 'midnite');
const linkTarget = '/usr/local/bin/midnite';
let linked = false;
try {
  execFileSync('ln', ['-sf', shim, linkTarget], { stdio: 'ignore' });
  linked = true;
} catch {
  /* not writable — print the manual command below */
}

console.log(`\n✓ installed ${installed} — open it from /Applications (or \`open ${installed}\`).`);
console.log(
  linked
    ? `✓ linked the midnite CLI → ${linkTarget} (run \`midnite --help\`).`
    : `• to use the CLI, symlink it onto PATH:\n    sudo ln -sf "${shim}" ${linkTarget}`,
);
