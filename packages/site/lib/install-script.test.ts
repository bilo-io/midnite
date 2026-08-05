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
