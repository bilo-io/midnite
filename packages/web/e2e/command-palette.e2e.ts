import { expect, test } from '@playwright/test';

/**
 * Command palette + global keyboard shortcuts (Phase 41 Themes A–C). The
 * search-result wire is proven in `search-palette.e2e.ts`; this spec locks in
 * the verification criteria that path doesn't touch — the always-on palette
 * sections, the static global commands (Toggle theme), the `?` help overlay,
 * and the `G …` nav chords + `N` new-task shortcut. No seed data is needed:
 * every assertion is against client behaviour, not gateway content.
 */
test.describe('Command palette & global shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    // A fresh e2e gateway auto-opens the setup wizard (a `[role="dialog"]` that
    // legitimately suppresses board shortcuts and would sit atop the new-task
    // modal); the idle screensaver would also steal focus. Dismiss both, and pin
    // the theme to dark so the toggle assertion has a known starting point.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86400 }));
        localStorage.setItem('midnite.theme', 'dark');
      } catch {
        // web storage may be unavailable — best effort.
      }
    });
  });

  test('⌘K shows the always-on sections and a Settings nav entry routes', async ({ page }) => {
    await page.goto('/dashboard');

    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();

    // Commands + Navigation sections render before any query is typed.
    await expect(palette.getByText('Commands', { exact: true })).toBeVisible();
    await expect(palette.getByText('Navigation', { exact: true })).toBeVisible();

    // The always-on "Settings" nav entry routes and closes the palette.
    await palette.getByText('Settings', { exact: true }).click();
    await expect(palette).toBeHidden();
    await expect(page).toHaveURL(/\/settings\/?$/);
  });

  test('the "Toggle theme" command flips the dark class', async ({ page }) => {
    await page.goto('/dashboard');
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();

    // Filter to the static global command and run it.
    await palette.getByRole('textbox', { name: 'Search commands and content' }).fill('theme');
    await palette.getByText('Toggle light / dark theme').click();

    await expect(palette).toBeHidden();
    await expect(html).not.toHaveClass(/dark/);
  });

  test('? opens the shortcuts help overlay grouped by section; Esc closes it', async ({ page }) => {
    await page.goto('/dashboard');

    await page.keyboard.press('?');
    const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(help).toBeVisible();

    // All three groups are present.
    await expect(help.getByText('General', { exact: true })).toBeVisible();
    await expect(help.getByText('Navigation', { exact: true })).toBeVisible();
    await expect(help.getByText('Board', { exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(help).toBeHidden();
  });

  test('G O / G S nav chords navigate to the right pages', async ({ page }) => {
    await page.goto('/dashboard');

    // The global keymap attaches on hydration, which the Next dev server does
    // asynchronously — the first chord can land before the listener exists, so
    // retry the whole chord (a plain URL retry never re-sends the keys).
    await expect(async () => {
      await page.keyboard.press('g');
      await page.keyboard.press('o');
      await expect(page).toHaveURL(/\/office\/?$/, { timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    await page.keyboard.press('g');
    await page.keyboard.press('s');
    await expect(page).toHaveURL(/\/settings\/?$/);
  });

  test('N opens the new-task form when no input is focused', async ({ page }) => {
    // The `midnite:new-task` listener lives on the board (tasks-view).
    await page.goto('/tasks');

    // Retry the press until the hydrated keymap picks it up (see the chord test).
    await expect(async () => {
      await page.keyboard.press('n');
      await expect(page.getByRole('dialog', { name: 'New task' })).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
  });
});
