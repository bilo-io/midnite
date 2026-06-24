import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { E2E_GATEWAY_PORT, E2E_WEB_PORT, GATEWAY_ORIGIN, WEB_ORIGIN } from './e2e/config';

// moon runs `pnpm exec playwright test` from this package directory, so cwd is
// packages/web. Anchor the gateway's config + uploads paths to absolutes off it.
const webDir = process.cwd();
const gatewayDir = path.join(webDir, '..', 'gateway');
const e2eConfigPath = path.join(webDir, 'e2e', 'fixtures', 'midnite.e2e.json');
const uploadsDir = path.join(os.tmpdir(), 'midnite-e2e-uploads');
// A dedicated, throwaway SQLite file (absolute — DbFactory resolves a relative
// path against cwd and treats ":memory:" as a literal filename, so neither is
// safe). Deleted before each run for a clean store; never the dev/primary DB.
const e2eDbPath = path.join(os.tmpdir(), 'midnite-e2e.db');

const isCI = !!process.env['CI'];

/**
 * Free a TCP port before the run by killing whatever holds it (best-effort,
 * POSIX). `reuseExistingServer: false` only makes Playwright poll the health
 * URL — it does NOT vacate the port — so a server orphaned by a previous run
 * (its node grandchild outliving the killed pnpm wrapper) keeps answering and
 * gets silently reused with stale data. This dev box runs several agents in
 * parallel, so that orphan is real. Clearing our ports here, at config-eval
 * (before Playwright launches anything), guarantees a fresh gateway on a clean
 * temp DB and a fresh app pointed at it. The ports are harness-private (see
 * e2e/config.ts), so this only ever kills our own orphans.
 * No-op on CI (no orphans; `lsof` may be absent).
 */
function freePort(port: number): void {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] });
    for (const pid of out.toString().trim().split('\n').filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGKILL');
      } catch {
        // already gone
      }
    }
  } catch {
    // nothing on the port, or lsof unavailable — nothing to free.
  }
}

// Only the runner process should reset state — Playwright re-imports this config
// in every worker, and a worker runs *after* the servers are up, so doing it
// there would kill the very servers under test. Workers set TEST_WORKER_INDEX.
if (process.env['TEST_WORKER_INDEX'] === undefined) {
  freePort(E2E_GATEWAY_PORT);
  freePort(E2E_WEB_PORT);
  // Start from an empty store. (A reused orphan gateway would still hold the old
  // file handle, hence freePort above — together they guarantee a fresh DB.)
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${e2eDbPath}${suffix}`, { force: true });
  }
}

/**
 * Playwright flow tests (Phase 10 Theme D). Two web servers boot together:
 *
 *  - the **real gateway** via `tsx`, on a throwaway temp SQLite file (removed
 *    before each run, so seed data is deterministic) with its agent pool disabled
 *    and no LLM credentials — it serves real REST/WS but never spawns or calls out;
 *  - the **Next dev server**, pointed at that gateway via `NEXT_PUBLIC_GATEWAY_URL`.
 *
 * Kept out of `moon ci` / the default `:test` gate (it's heavier and spawns
 * servers); run it with `moon run web:e2e`. A dedicated CI job is Theme F.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  // One worker so the shared gateway store isn't mutated concurrently.
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: WEB_ORIGIN,
    trace: 'on-first-retry',
  },
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // Allow up to 0.5% of pixels to differ (font rendering, subpixel AA).
      // Baselines are generated on Linux (Docker) so CI always matches exactly;
      // the ratio guards against a legitimately-different but still-correct render
      // on a developer's machine when they're not regenerating baselines.
      maxDiffPixelRatio: 0.005,
    },
  },
  projects: [
    // Flow tests (Theme D): the `*.e2e.ts` specs.
    {
      name: 'chromium',
      testMatch: '**/*.e2e.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Deterministic screenshot capture (Theme E1) + visual regression (Theme E2):
    // the `*.shots.ts` specs at a fixed 1440×900 viewport. The spec captures
    // preview PNGs to `e2e/__shots__/` (gitignored, E1) AND asserts against
    // committed OS-pinned baselines in `e2e/__screenshots__/` (E2). Generate /
    // update baselines with `--update-snapshots` (run via Docker for Linux parity).
    {
      name: 'screenshots',
      testMatch: '**/*.shots.ts',
      snapshotDir: './e2e/__screenshots__',
      snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: [
    {
      // Boot the gateway as a direct `node` child (tsx as a loader, not the tsx
      // binary, and no pnpm wrapper) so it stays in Playwright's process group
      // and gets killed on teardown — a pnpm/tsx wrapper detaches the real node
      // process, orphaning a gateway that the next run would silently reuse.
      command: 'node --import tsx src/main.ts',
      cwd: gatewayDir,
      url: `${GATEWAY_ORIGIN}/health`,
      // Always boot a fresh gateway so its (pre-cleared) temp store starts empty.
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        MIDNITE_CONFIG_PATH: e2eConfigPath,
        MIDNITE_GATEWAY_PORT: String(E2E_GATEWAY_PORT),
        MIDNITE_GATEWAY_DB_PATH: e2eDbPath,
        MIDNITE_GATEWAY_UPLOADS_DIR: uploadsDir,
        // Force the LLM off so task creation never makes an external call and
        // titles are deterministic (placeholder = the prompt's first line). The
        // config has no key, but the Anthropic adapter otherwise falls back to a
        // machine API key and, on macOS, the `claude` login keychain (keyed by
        // $USER) — so clear the provider keys and blank $USER to defeat that
        // lookup. On Linux CI the keychain path is skipped anyway.
        ANTHROPIC_API_KEY: '',
        OPENAI_API_KEY: '',
        GEMINI_API_KEY: '',
        GOOGLE_API_KEY: '',
        USER: '',
      },
    },
    {
      command: `pnpm exec next dev -p ${E2E_WEB_PORT}`,
      url: WEB_ORIGIN,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_GATEWAY_URL: GATEWAY_ORIGIN,
      },
    },
  ],
});
