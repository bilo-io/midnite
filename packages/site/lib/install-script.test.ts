import { execFileSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  ftruncateSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * `public/install.sh` is served live from the site, so a broken integrity check
 * there breaks installs for everyone immediately — with no build or type error to
 * catch it. These tests exercise its `verify_bundle` gate directly by extracting
 * the function from the real script and running it under `sh` against fixture
 * bundles.
 *
 * The regression that motivated them: `verify_bundle` derived the executable name
 * from the *directory* it was verifying, so the staged copy
 * (`/Applications/.midnite.app.new.$$`) was checked for
 * `Contents/MacOS/.midnite.app.new.1234` and every install aborted with
 * "staged copy is incomplete".
 */

/**
 * Locate `public/install.sh` from the runner's cwd (the package root under
 * `vitest run`, the workspace root under some moon invocations). `import.meta.url`
 * isn't a file: URL in this package's jsdom environment, so walk up instead.
 */
function findInstallScript(): string {
  const candidates = ['public/install.sh', 'packages/site/public/install.sh'];
  let dir = process.cwd();
  for (;;) {
    for (const rel of candidates) {
      const candidate = path.join(dir, rel);
      if (existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('could not locate public/install.sh');
    dir = parent;
  }
}

const scriptPath = findInstallScript();
const scriptSource = readFileSync(scriptPath, 'utf8');

/** Extract a shell function definition from the real script, by name. */
function functionSnippet(name: string): string {
  const start = scriptSource.indexOf(`${name}() {`);
  expect(start, `install.sh should define ${name}()`).toBeGreaterThan(-1);
  const end = scriptSource.indexOf('\n}\n', start);
  expect(end, `${name}() should be closed by a top-level }`).toBeGreaterThan(start);
  return scriptSource.slice(start, end + 2);
}

/**
 * The post-install cleanup of the pre-rename `midnite.app`, as a runnable
 * snippet. Extracted rather than reimplemented so the test can't drift from the
 * live script.
 */
function legacyCleanupSnippet(): string {
  const start = scriptSource.indexOf('legacy="$DEST/midnite.app"');
  expect(start, 'install.sh should define the legacy cleanup block').toBeGreaterThan(-1);
  const end = scriptSource.indexOf('\nfi\n', start);
  expect(end, 'the legacy cleanup block should be closed by a top-level fi').toBeGreaterThan(start);
  return scriptSource.slice(start, end + 4);
}

/** The `verify_bundle` function plus the constant it reads, as a runnable snippet. */
function verifyBundleSnippet(): string {
  const minBytes = /^MIN_FRAMEWORK_BYTES=.*$/m.exec(scriptSource);
  const start = scriptSource.indexOf('verify_bundle() {');
  const end = scriptSource.indexOf('\n}\n', start);
  expect(minBytes, 'install.sh should define MIN_FRAMEWORK_BYTES').not.toBeNull();
  expect(start, 'install.sh should define verify_bundle()').toBeGreaterThan(-1);
  expect(end, 'verify_bundle() should be closed by a top-level }').toBeGreaterThan(start);
  return `${minBytes![0]}\n${scriptSource.slice(start, end + 2)}`;
}

/** Run `verify_bundle <bundle> [exe]`; returns the exit status and stderr. */
function runVerify(bundle: string, exe?: string): { ok: boolean; stderr: string } {
  const args = exe === undefined ? '"$1"' : '"$1" "$2"';
  const program = `${verifyBundleSnippet()}\nverify_bundle ${args}`;
  try {
    execFileSync('sh', ['-c', program, 'sh', bundle, exe ?? ''], { encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, stderr: '' };
  } catch (err) {
    const e = err as { stderr?: Buffer | string };
    return { ok: false, stderr: String(e.stderr ?? '') };
  }
}

/**
 * Build a structurally complete .app fixture. `frameworkBytes` is written as a
 * sparse file, so a realistic ~150MB Electron Framework costs no disk.
 */
function makeBundle(
  root: string,
  bundleName: string,
  { exe, frameworkBytes = 150 * 1024 * 1024 }: { exe: string; frameworkBytes?: number },
): string {
  const bundle = path.join(root, bundleName);
  mkdirSync(path.join(bundle, 'Contents', 'MacOS'), { recursive: true });
  const fwDir = path.join(bundle, 'Contents', 'Frameworks', 'Electron Framework.framework', 'Versions', 'A');
  mkdirSync(fwDir, { recursive: true });
  writeFileSync(
    path.join(bundle, 'Contents', 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>${exe}</string>
</dict></plist>
`,
  );
  writeFileSync(path.join(bundle, 'Contents', 'MacOS', exe), '#!/bin/sh\n', { mode: 0o755 });
  const fd = openSync(path.join(fwDir, 'Electron Framework'), 'w');
  ftruncateSync(fd, frameworkBytes);
  closeSync(fd);
  return bundle;
}

// The gate is macOS-only (PlistBuddy, `stat -f%z`) — as is the install path it guards.
describe.skipIf(process.platform !== 'darwin')('install.sh verify_bundle', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'install-sh-'));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts a complete bundle', () => {
    const bundle = makeBundle(dir, 'midnite.app', { exe: 'midnite' });
    expect(runVerify(bundle, 'midnite').ok).toBe(true);
  });

  it('accepts a complete bundle staged under a temp name', () => {
    // The exact shape of the staged copy: $DEST/.$APP.new.$$
    const bundle = makeBundle(dir, '.midnite.app.new.29224', { exe: 'midnite' });
    expect(runVerify(bundle, 'midnite').ok).toBe(true);
  });

  it('reads the executable name from Info.plist when the caller passes none', () => {
    const bundle = makeBundle(dir, '.Midnite.app.new.31337', { exe: 'Midnite' });
    expect(runVerify(bundle).ok).toBe(true);
  });

  it('rejects a bundle whose executable is missing', () => {
    const bundle = makeBundle(dir, 'no-exe.app', { exe: 'midnite' });
    rmSync(path.join(bundle, 'Contents', 'MacOS', 'midnite'));
    const { ok, stderr } = runVerify(bundle, 'midnite');
    expect(ok).toBe(false);
    expect(stderr).toContain('missing Contents/MacOS/midnite');
  });

  it('rejects a truncated Electron Framework', () => {
    const bundle = makeBundle(dir, 'truncated.app', { exe: 'midnite', frameworkBytes: 1024 });
    const { ok, stderr } = runVerify(bundle, 'midnite');
    expect(ok).toBe(false);
    expect(stderr).toContain('incomplete copy');
  });

  it('rejects a bundle with no Info.plist', () => {
    const bundle = makeBundle(dir, 'no-plist.app', { exe: 'midnite' });
    rmSync(path.join(bundle, 'Contents', 'Info.plist'));
    const { ok, stderr } = runVerify(bundle, 'midnite');
    expect(ok).toBe(false);
    expect(stderr).toContain('missing Contents/Info.plist');
  });
});

/**
 * The v0.11.0 rebrand renamed the bundle midnite.app → Midnite.app, and the
 * installer removes the pre-rename copy so a case-SENSITIVE volume doesn't end up
 * with two apps. On the default case-INSENSITIVE volume those two names are one
 * entry — so that cleanup must recognise it and do nothing, or it deletes the app
 * it just installed. It did exactly that: the guard compared `cd … && pwd -P`,
 * which resolves symlinks but not case, and under `sh` (how `curl … | sh` runs it)
 * returns the spelling it was given. Every macOS install ended with
 * "✓ Midnite v0.11.0 installed." immediately followed by
 * "The file /Applications/Midnite.app does not exist."
 *
 * These run under `sh` specifically — an interactive zsh canonicalises the case
 * and hides the bug.
 */
describe.skipIf(process.platform !== 'darwin')('install.sh pre-rename cleanup', () => {
  let dir: string;
  /** Whether the temp volume folds case, i.e. whether this bug is reachable here. */
  let caseInsensitive = false;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'install-sh-legacy-'));
    mkdirSync(path.join(dir, 'Probe.app'));
    caseInsensitive = existsSync(path.join(dir, 'probe.app'));
    rmSync(path.join(dir, 'Probe.app'), { recursive: true, force: true });
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** Run the real cleanup block against $DEST, with `run`/`say` stubbed. */
  function runCleanup(dest: string, app: string): void {
    const program = [
      functionSnippet('same_entry'),
      'say() { :; }',
      'run() { "$@"; }',
      `APP=${JSON.stringify(app)}`,
      `DEST=${JSON.stringify(dest)}`,
      legacyCleanupSnippet(),
    ].join('\n');
    execFileSync('sh', ['-c', program], { encoding: 'utf8', stdio: 'pipe' });
  }

  it('keeps the installed app when midnite.app is the same entry as Midnite.app', () => {
    if (!caseInsensitive) return; // case-sensitive volume: the two names can't collide
    const dest = mkdtempSync(path.join(dir, 'dest-'));
    makeBundle(dest, 'Midnite.app', { exe: 'Midnite' });
    expect(existsSync(path.join(dest, 'midnite.app')), 'precondition: the volume folds case').toBe(true);

    runCleanup(dest, 'Midnite.app');

    expect(existsSync(path.join(dest, 'Midnite.app', 'Contents', 'MacOS', 'Midnite'))).toBe(true);
  });

  it('removes a genuinely separate pre-rename bundle', () => {
    const dest = mkdtempSync(path.join(dir, 'dest-'));
    makeBundle(dest, 'Midnite.app', { exe: 'Midnite' });
    // Stand in for the case-sensitive-volume situation: a distinct directory the
    // installer should reclaim. On a case-folding volume these ARE one entry, so
    // use a name that differs by more than case.
    const legacy = caseInsensitive ? 'midnite-old.app' : 'midnite.app';
    makeBundle(dest, legacy, { exe: 'midnite' });

    const program = [
      functionSnippet('same_entry'),
      'say() { :; }',
      'run() { "$@"; }',
      'APP="Midnite.app"',
      `DEST=${JSON.stringify(dest)}`,
      legacyCleanupSnippet().replace('$DEST/midnite.app', `$DEST/${legacy}`),
    ].join('\n');
    execFileSync('sh', ['-c', program], { encoding: 'utf8', stdio: 'pipe' });

    expect(existsSync(path.join(dest, legacy)), 'the separate old bundle should be removed').toBe(false);
    expect(existsSync(path.join(dest, 'Midnite.app', 'Contents', 'MacOS', 'Midnite'))).toBe(true);
  });

  it('same_entry treats two spellings of one directory as the same entry', () => {
    if (!caseInsensitive) return;
    const dest = mkdtempSync(path.join(dir, 'dest-'));
    mkdirSync(path.join(dest, 'Thing.app'));
    const program = `${functionSnippet('same_entry')}\nsame_entry "$1" "$2"`;
    const same = (a: string, b: string): boolean => {
      try {
        execFileSync('sh', ['-c', program, 'sh', a, b], { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    };
    expect(same(path.join(dest, 'thing.app'), path.join(dest, 'Thing.app'))).toBe(true);
    mkdirSync(path.join(dest, 'Other.app'));
    expect(same(path.join(dest, 'Other.app'), path.join(dest, 'Thing.app'))).toBe(false);
    // Fail-safe: an unstattable path must not read as "different" and license a delete.
    expect(same(path.join(dest, 'missing.app'), path.join(dest, 'Thing.app'))).toBe(true);
  });
});
