import { expect, test, type Page } from '@playwright/test';

import { column } from './helpers/board';

/**
 * Quick-capture widget (Phase 7 Theme C). Seed the default dashboard tab with the
 * quick-capture widget (via its localStorage key, read by the grid on mount),
 * then drive it against the **live gateway**: typing a task and pressing Add must
 * create a real task — proved by navigating to the board and finding it in the
 * Todo column.
 *
 * Queries are scoped to the widget card — the dashboard also mounts the always-on
 * prompt composer + the add-widget/-dashboard buttons, so an unscoped
 * `getByRole('button', { name: 'Add' })` is ambiguous.
 */
const WIDGETS_KEY = 'midnite.dashboard.widgets';

/** The quick-capture WidgetCard, isolated by its title. */
function captureCard(page: Page) {
  return page.locator('div.rounded-xl').filter({ hasText: 'Quick capture' });
}

test.describe('Quick capture widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, JSON.stringify([{ type: 'quick-capture' }]));
    }, WIDGETS_KEY);
  });

  test('adds a task from the dashboard and it lands in Todo', async ({ page }) => {
    await page.goto('/dashboard');

    const card = captureCard(page);
    await expect(card).toBeVisible();
    const field = card.getByLabel('Task');
    await expect(field).toBeVisible();

    const title = `E2E quick capture — ${Date.now()}`;
    await field.fill(title);
    await card.getByRole('button', { name: 'Add' }).click();

    // Confirmation appears and the field clears.
    await expect(card.getByText(/Added/)).toBeVisible();
    await expect(field).toHaveValue('');

    // The task is real: it shows up on the board's Todo column after a refetch.
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();
    await expect(column(page, 'Todo').getByText(title)).toBeVisible();
  });

  test('bulk mode creates several tasks from a pasted list', async ({ page }) => {
    await page.goto('/dashboard');

    const card = captureCard(page);
    await card.getByRole('button', { name: 'Bulk' }).click();
    const stamp = Date.now();
    const lines = [`E2E bulk A ${stamp}`, `E2E bulk B ${stamp}`, `E2E bulk C ${stamp}`];
    await card.getByLabel('Tasks (one per line)').fill(lines.join('\n'));
    await card.getByRole('button', { name: 'Add' }).click();

    await expect(card.getByText(/Added 3 tasks/)).toBeVisible();

    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();
    for (const line of lines) {
      await expect(column(page, 'Todo').getByText(line)).toBeVisible();
    }
  });
});
