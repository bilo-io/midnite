import { expect, test } from '@playwright/test';

import { seedTask, type SeededTask } from './helpers/gateway';

/**
 * Phase 61 Theme G — the per-task run timeline drill-down on the Ops page. Enter
 * a task id and the <RunTimeline> strip renders below. A fresh e2e gateway has no
 * `agent_run_stats` rows (its agent pool is disabled, so seeded tasks never spawn
 * a run), so we assert the honest empty state rather than forcing unseeded data.
 * The data/render paths are covered by shared, gateway, RTL, and Storybook tests.
 */
let timelineTask: SeededTask;

test.beforeAll(async () => {
  timelineTask = await seedTask('E2E run-timeline drill-down', 'todo');
});

test.describe('Ops run-timeline drill-down', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress the auto-opening setup wizard + idle screensaver on a fresh gateway.
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

  test('renders a task’s run strip (empty state when no runs are recorded)', async ({ page }) => {
    await page.goto('/ops');

    // Scope to the drill-down card by its heading.
    const card = page
      .locator('div.rounded-xl.border.bg-card')
      .filter({ has: page.getByRole('heading', { name: 'Run timeline' }) });
    await expect(card).toBeVisible();

    // Prompt before any id is entered.
    await expect(card.getByText('Enter a task id above to see its agent run strip.')).toBeVisible();

    // Enter the seeded task id and submit.
    await card.getByLabel('Task id').fill(timelineTask.id);
    await card.getByRole('button', { name: 'Show' }).click();

    // No runs seeded → the honest empty state renders (not a zeroed chart).
    await expect(card.getByText('No agent runs recorded yet.')).toBeVisible();
  });
});
