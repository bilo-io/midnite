import { expect, test } from '@playwright/test';

import { column } from './helpers/board';
import { seedTask, type SeededTask } from './helpers/gateway';

// Phase 42 Theme B — the in-app task modal, URL-driven under static export.
// Clicking a card opens the task as a modal overlay and the URL becomes
// `/tasks?task=<id>` (the board stays mounted behind it); closing pops back to
// the board; the legacy `?open=` param redirects to `?task=`; and a direct link
// to `?task=` is refresh-safe. Shareable full-page links stay at
// `/tasks/view?id=` (covered by task-detail.e2e.ts).
let modalTask: SeededTask;

test.beforeAll(async () => {
  modalTask = await seedTask('E2E task modal — click to open', 'todo');
});

test.describe('Task detail modal (?task=)', () => {
  test.beforeEach(async ({ page }) => {
    // Keep the setup wizard + the inactivity screensaver out of the way so they
    // don't intercept clicks mid-flow.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86400 }));
        localStorage.setItem('midnite.theme', 'dark');
      } catch {
        // best effort
      }
    });
  });

  test('clicking a card opens the modal and sets ?task=, board stays mounted', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();

    await column(page, 'Todo').getByText(modalTask.title).click();

    // The modal opens over the board…
    const dialog = page.getByRole('dialog', { name: modalTask.title });
    await expect(dialog).toBeVisible();
    // …the URL reflects it…
    await expect(page).toHaveURL(new RegExp(`[?&]task=${modalTask.id}(&|$)`));
    // …and the board is still mounted behind it (not a full-page navigation).
    await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();
  });

  test('closing the modal returns to the board', async ({ page }) => {
    await page.goto('/tasks');
    await column(page, 'Todo').getByText(modalTask.title).click();
    await expect(page.getByRole('dialog', { name: modalTask.title })).toBeVisible();

    // Escape closes it (router.back), unwinding the ?task= history entry.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: modalTask.title })).toBeHidden();
    await expect(page).toHaveURL(/\/tasks\/?(\?.*)?$/);
    await expect(page).not.toHaveURL(/[?&]task=/);
  });

  test('legacy ?open= redirects to ?task= and opens the modal', async ({ page }) => {
    await page.goto(`/tasks?open=${modalTask.id}`);

    // The redirect swaps the param and the modal opens.
    await expect(page.getByRole('dialog', { name: modalTask.title })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]task=${modalTask.id}(&|$)`));
    await expect(page).not.toHaveURL(/[?&]open=/);
  });

  test('a direct ?task= link opens the modal (refresh-safe)', async ({ page }) => {
    await page.goto(`/tasks?task=${modalTask.id}`);
    await expect(page.getByRole('dialog', { name: modalTask.title })).toBeVisible();

    // Reloading the same URL re-opens it — the modal is derived from the URL.
    await page.reload();
    await expect(page.getByRole('dialog', { name: modalTask.title })).toBeVisible();
  });
});
