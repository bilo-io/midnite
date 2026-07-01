import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedTask } from './helpers/gateway';

/**
 * Phase 51 B/C — the session detail cockpit: a large center terminal region
 * (Theme C: live interactive terminal for a running session, read-only transcript
 * for an ended one) flanked by two collapsible rails. A session is a 1:1 view over
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

test('session detail — cockpit with a live terminal', async ({ page }) => {
  const task = await seedTask('Wire up the session detail page', 'wip');
  await page.goto(`/sessions/view?id=${task.id}`);

  await expect(page.getByRole('heading', { name: 'Wire up the session detail page' })).toBeVisible();
  await expect(page.getByText('Approvals & context')).toBeVisible();
  await expect(page.getByText('Session info')).toBeVisible();
  // Theme C: a running session forks to the live terminal, badged "live".
  await expect(page.getByText('Terminal', { exact: true })).toBeVisible();
  await expect(page.getByText('live', { exact: true })).toBeVisible();
  // Theme E: the right-rail info readout renders its real fields.
  await expect(page.getByText('Last activity')).toBeVisible();
  await page.screenshot({ path: join(OUT, 'session-detail-live.png') });
});

test('session detail — ended session shows the read-only transcript', async ({ page }) => {
  const task = await seedTask('Ship the transcript view', 'done');
  await page.goto(`/sessions/view?id=${task.id}`);

  await expect(page.getByRole('heading', { name: 'Ship the transcript view' })).toBeVisible();
  // Theme C: a completed session forks to the read-only transcript, badged ended.
  await expect(page.getByText(/ended · read-only/)).toBeVisible();
  await page.screenshot({ path: join(OUT, 'session-detail-ended.png') });
});

test('sessions list — each card links into the cockpit (Theme F)', async ({ page }) => {
  await seedTask('Wire the entry points', 'wip');
  await page.goto('/sessions');

  await expect(page.getByText('Wire the entry points').first()).toBeVisible();
  // Theme F: every card/row exposes an explicit "Open session page" link.
  await expect(page.getByRole('link', { name: 'Open session page' }).first()).toBeVisible();
  await page.screenshot({ path: join(OUT, 'sessions-list-open-links.png') });
});
