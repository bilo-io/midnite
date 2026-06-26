import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { column } from './helpers/board';
import { seedTask, type SeededTask } from './helpers/gateway';

// Board keyboard navigation (Phase 41 Theme D). The board filters by the `q`
// query param (title substring), so a uniquely-titled seed isolates a single
// card in its column — making arrow focus land deterministically on *our* card
// even though the shared e2e gateway holds tasks from other specs.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

let navAlpha: SeededTask;
let doneTarget: SeededTask;
let abandonTarget: SeededTask;

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  [navAlpha, doneTarget, abandonTarget] = await Promise.all([
    seedTask('E2E kbdnav alpha card', 'todo'),
    seedTask('E2E kbddone target card', 'todo'),
    seedTask('E2E kbdabandon target card', 'todo'),
  ]);
});

/**
 * Press ArrowDown until a focus ring appears. The Next dev server hydrates
 * asynchronously, so the window keydown listener may not be attached on the
 * first press — retry the press itself (a plain `toHaveCount` retry only
 * re-checks the DOM, it never re-sends the key).
 */
async function focusFirstCard(page: Page): Promise<void> {
  await expect(async () => {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-focused]')).toHaveCount(1);
  }).toPass({ timeout: 10_000 });
}

test.describe('Board keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    // On a fresh e2e gateway the setup wizard auto-opens (provider not "ready").
    // It's a `[role="dialog"]` that legitimately suppresses board shortcuts, so
    // dismiss it (and the idle screensaver) before driving the keyboard.
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

  test('arrow keys show a focus ring and Enter opens the focused card', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    // Isolate a single card so focus is deterministic.
    await page.goto(`/tasks?q=${encodeURIComponent('E2E kbdnav alpha')}`);
    await expect(column(page, 'Todo').getByText(navAlpha.title).first()).toBeVisible();

    // Before: nothing focused.
    await expect(page.locator('[data-focused]')).toHaveCount(0);
    await page.screenshot({ path: join(OUT, 'board-kbd-before.png') });

    // ArrowDown seeds the focus ring onto the only visible card.
    await focusFirstCard(page);
    await page.screenshot({ path: join(OUT, 'board-kbd-after.png') });

    // Enter opens its detail modal.
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText(navAlpha.title);

    // Shortcuts are suppressed while the modal is open: an arrow doesn't disturb
    // the dialog.
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('D marks the focused card done', async ({ page }) => {
    await page.goto(`/tasks?q=${encodeURIComponent('E2E kbddone target')}`);
    await expect(column(page, 'Todo').getByText(doneTarget.title).first()).toBeVisible();

    await focusFirstCard(page);

    // A normal todo→done is immediate (no confirm). The focused card lands in Done.
    await page.keyboard.press('d');
    await expect(column(page, 'Done').getByText(doneTarget.title).first()).toBeVisible();

    // Persisted, not just optimistic.
    await page.reload();
    await expect(column(page, 'Done').getByText(doneTarget.title).first()).toBeVisible();
  });

  test('A prompts for confirmation, then abandons the focused card', async ({ page }) => {
    await page.goto(`/tasks?q=${encodeURIComponent('E2E kbdabandon target')}`);
    await expect(column(page, 'Todo').getByText(abandonTarget.title).first()).toBeVisible();

    await focusFirstCard(page);

    // A always confirms first (the confirm dialog is an alertdialog).
    await page.keyboard.press('a');
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toContainText('Abandon this task?');
    await confirmDialog.getByRole('button', { name: 'Abandon' }).click();

    // The abandoned card leaves the status columns (it moves to the tucked-away
    // Abandoned section, which renders plain cards with no focus ring), so the
    // ring count drops back to zero.
    await expect(page.locator('[data-focused]')).toHaveCount(0);
  });
});
