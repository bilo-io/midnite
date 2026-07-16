import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { column } from './helpers/board';
import { seedTask } from './helpers/gateway';

/**
 * Phase 69 E — reopen a terminal task from the board. Seeds a `done` task, reveals
 * its hover "Reopen" affordance, reopens it through the confirm dialog, and asserts
 * it lands back in Todo without a reload. Doubles as the visual capture for the PR.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test('reopen a done task from the board → returns to Todo', async ({ page }) => {
  const done = await seedTask('E2E reopen — shipped feature', 'done');

  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      // storage unavailable — harmless
    }
  });

  await page.goto('/tasks');
  const doneCol = column(page, 'Done');
  const card = doneCol.locator('div.group', { hasText: done.title });
  await expect(card).toBeVisible();

  // Reveal the hover affordance and capture the board with the Reopen button.
  await card.hover();
  const reopenBtn = card.getByRole('button', { name: 'Reopen task' });
  await expect(reopenBtn).toBeVisible();
  await page.screenshot({ path: `${OUT}/reopen-board-done-card.png` });

  // Reopen → confirm dialog → the task moves out of Done into Todo (no reload).
  await reopenBtn.click();
  await page.getByRole('button', { name: 'Reopen', exact: true }).click();

  await expect(column(page, 'Todo').getByText(done.title)).toBeVisible();
  await expect(doneCol.getByText(done.title)).toHaveCount(0);
  await page.screenshot({ path: `${OUT}/reopen-board-after.png` });
});
