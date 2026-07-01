import { expect, test } from '@playwright/test';

import { seedTask, type SeededTask } from './helpers/gateway';

// Phase 42 Theme A — the shareable `/tasks/view?id=` full detail page. Direct
// navigation / refresh must render the full page (output: 'export' can't
// prerender ids, so the id rides the query string and the view fetches it
// client-side), and an unknown id must show an inline not-found, not a crash.
let detailTask: SeededTask;

test.beforeAll(async () => {
  detailTask = await seedTask('E2E task detail — shareable page', 'todo');
});

test.describe('Task detail page', () => {
  test('direct link renders the full task detail', async ({ page }) => {
    await page.goto(`/tasks/view?id=${detailTask.id}`);

    // The detail header shows the task title…
    await expect(page.getByRole('heading', { name: detailTask.title })).toBeVisible();
    // …and the shared <TaskDetail> body sections are present.
    await expect(page.getByRole('heading', { name: 'Dependencies' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
    // Refresh-safe: reloading the URL re-renders the same page.
    await page.reload();
    await expect(page.getByRole('heading', { name: detailTask.title })).toBeVisible();
  });

  test('back affordance returns to the board', async ({ page }) => {
    await page.goto(`/tasks/view?id=${detailTask.id}`);
    await page.getByRole('button', { name: 'All tasks' }).click();
    await expect(page).toHaveURL(/\/tasks\/?$/);
  });

  test('an unknown id shows an inline not-found, not a crash', async ({ page }) => {
    await page.goto('/tasks/view?id=does-not-exist');
    await expect(page.getByText('Task not found.')).toBeVisible();
  });
});
