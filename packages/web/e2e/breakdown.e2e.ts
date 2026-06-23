import { expect, test, type Page } from '@playwright/test';

import { column } from './helpers/board';
import { seedProject } from './helpers/gateway';

/**
 * Project → planned board flow (Phase 28 Theme C). Seeds a real project over the
 * gateway, opens its plan panel, switches to the **Breakdown** tab, generates a
 * structured breakdown, and confirms it onto the board.
 *
 * The e2e gateway runs with the LLM disabled, so `draft-breakdown` fails open to
 * a single-task fallback whose title IS the project description — deterministic,
 * and it exercises the same preview → edit → create path the AI breakdown uses.
 */

/** The plan panel dialog, scoped by its accessible label. */
function planDialog(page: Page, projectName: string) {
  return page.getByRole('dialog', { name: new RegExp(`Plan for ${projectName}`) });
}

test.describe('Breakdown flow', () => {
  test.beforeEach(async ({ page }) => {
    // On a fresh e2e gateway the setup wizard auto-opens (provider not "ready")
    // and would intercept clicks; the idle screensaver (30s default) would also
    // float over the page during a slow step. Suppress both.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86400 }));
      } catch {
        // web storage may be unavailable — best effort.
      }
    });
  });

  test('generates a breakdown and creates a dependency-sequenced board', async ({ page }) => {
    const stamp = Date.now();
    const description = `Ship an e2e breakdown ${stamp}`;
    const project = await seedProject(`Breakdown Proj ${stamp}`, description);

    await page.goto('/projects');

    // Open the project's plan panel — scope to the (uniquely-named) card so we
    // click *its* plan button, not another project's.
    const planButton = /Draft plan|^Plan$/;
    const card = page
      .locator('div')
      .filter({ hasText: project.name })
      .filter({ has: page.getByRole('button', { name: planButton }) })
      .last();
    await card.getByRole('button', { name: planButton }).click();

    const dialog = planDialog(page, project.name);
    await expect(dialog).toBeVisible();

    // Switch to the Breakdown tab and generate.
    await dialog.getByRole('tab', { name: /Breakdown/ }).click();
    await dialog.getByRole('button', { name: /Generate breakdown/ }).click();

    // The fallback preview renders the description as an editable task title.
    await expect(dialog.getByText(/AI planning was unavailable/)).toBeVisible();
    await expect(dialog.getByLabel('Title for task-1')).toHaveValue(description);

    // Confirm → the task lands on the board.
    await dialog.getByRole('button', { name: /Create 1 task/ }).click();
    await expect(dialog.getByText(/sequenced by dependencies/)).toBeVisible();

    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();
    await expect(column(page, 'Todo').getByText(description)).toBeVisible();
  });
});
