import { expect, test } from '@playwright/test';

import { seedTask } from './helpers/gateway';

/**
 * Command-palette content search (Phase 20 Theme C). Proves the full wire against
 * the **live gateway**: a seeded task is indexed on its create event, ⌘K opens
 * the palette, a debounced `GET /search` returns it grouped under "Tasks", and
 * Enter routes to the entity. Uses a unique numeric token in the prompt so the
 * match is deterministic across the shared e2e database and matches no page jump.
 */
test.describe('Command palette search', () => {
  test('finds a seeded task by content and routes to it', async ({ page }) => {
    const stamp = Date.now();
    const token = `pltprobe${stamp}`;
    const title = `Palette search probe ${token}`;
    await seedTask(title);

    await page.goto('/dashboard');

    // Open the palette with the global shortcut and search for the unique token.
    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();

    await palette.getByRole('textbox', { name: 'Search commands and content' }).fill(token);

    // The hit lands in the "Tasks" group (no page jump matches the numeric token).
    await expect(palette.getByText('Tasks')).toBeVisible();
    await expect(palette.getByText(title)).toBeVisible();

    // Enter routes to the entity and closes the palette.
    await page.keyboard.press('Enter');
    await expect(palette).toBeHidden();
    await expect(page).toHaveURL(/\/tasks$/);
  });

  test('skips the network and prompts for a longer query below the minimum', async ({ page }) => {
    await page.goto('/dashboard');

    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();

    await palette.getByRole('textbox', { name: 'Search commands and content' }).fill('a');
    await expect(palette.getByText(/Type at least 2 characters/)).toBeVisible();
  });
});
