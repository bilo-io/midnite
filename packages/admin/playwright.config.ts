import { defineConfig, devices } from '@playwright/test';

import { ADMIN_ORIGIN, E2E_ADMIN_PORT, GATEWAY_ORIGIN } from './e2e/config';

const isCI = !!process.env['CI'];

/**
 * Admin operator-console flow tests (Phase 73 Theme E). A lightweight mirror of
 * web's playwright setup: it boots the Next dev server pointed at a gateway origin
 * and drives the rail routes + the operator gate. The specs stub the gateway reads
 * they need via `page.route(...)`, so no real gateway is required for the nav spec.
 * Kept out of `moon ci` (spawns a server); run with `moon run admin:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: ADMIN_ORIGIN,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: '**/*.e2e.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `pnpm exec next dev -p ${E2E_ADMIN_PORT}`,
      url: ADMIN_ORIGIN,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_GATEWAY_URL: GATEWAY_ORIGIN,
      },
    },
  ],
});
