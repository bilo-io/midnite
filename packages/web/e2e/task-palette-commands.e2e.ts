import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, openPalette, test } from './helpers/harness';

import { SCREENSHOTS_DIR } from './config';
import { seedTask } from './helpers/gateway';

/**
 * Phase 42 C — contextual "Move to…" palette commands. With a task detail surface
 * open, ⌘K offers per-task status moves; they appear only while a task is open and
 * transition it correctly (the command for the new status drops out after the move).
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.describe('Contextual task palette commands', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('midnite.theme', 'dark');
      } catch {
        // best effort
      }
    });
    mkdirSync(OUT, { recursive: true });
  });

  test('appear while a task is open and transition it', async ({ page }) => {
    const task = await seedTask('Contextual command target', 'todo');
    await page.goto(`/tasks/view?id=${task.id}`);
    await expect(page.getByRole('heading', { name: 'Contextual command target' })).toBeVisible();

    // Commands show in ⌘K while the detail surface is mounted.
    const palette = await openPalette(page);
    await expect(palette.getByText('Mark done', { exact: true })).toBeVisible();
    await expect(palette.getByText('Move to waiting', { exact: true })).toBeVisible();
    await page.screenshot({ path: join(OUT, 'task-palette-commands.png') });

    // Invoking one transitions the task (persisted to the gateway). Reload to read
    // the current status fresh, then ⌘K no longer offers "Mark done" (already done).
    await palette.getByText('Mark done', { exact: true }).click();
    await expect(palette).toBeHidden();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Contextual command target' })).toBeVisible();
    const reopened = await openPalette(page);
    await expect(reopened.getByText('Mark done', { exact: true })).toHaveCount(0);
    await expect(reopened.getByText('Move to waiting', { exact: true })).toBeVisible();
  });

  test('vanish when no task is open', async ({ page }) => {
    await page.goto('/dashboard');
    const palette = await openPalette(page);
    await expect(palette.getByText('Mark done', { exact: true })).toHaveCount(0);
  });
});
