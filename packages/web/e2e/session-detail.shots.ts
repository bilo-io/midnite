import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedTask } from './helpers/gateway';

/**
 * Phase 51 B — the session detail cockpit shell: a large center region (terminal
 * lands in Theme C) flanked by two collapsible rails. A session is a 1:1 view over
 * its task, so seeding a task gives us a session id to open.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.use({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } });

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      /* best effort */
    }
  });
});

test('session detail — cockpit shell with two rails', async ({ page }) => {
  const task = await seedTask('Wire up the session detail page', 'wip');
  await page.goto(`/sessions/view?id=${task.id}`);

  await expect(page.getByRole('heading', { name: 'Wire up the session detail page' })).toBeVisible();
  await expect(page.getByText('Approvals & context')).toBeVisible();
  await expect(page.getByText('Session info')).toBeVisible();
  await expect(page.getByText(/Interactive terminal/)).toBeVisible();
  await page.screenshot({ path: join(OUT, 'session-detail-shell.png') });
});
