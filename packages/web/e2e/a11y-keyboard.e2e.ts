import { expect, mergeSettings, openPalette, test } from './helpers/harness';

import { pinUnifiedBoard } from './helpers/board';
import { seedTask, uniqueLabel } from './helpers/gateway';

/**
 * Phase 60 Theme I — keyboard/ARIA probe for the fixes this slice applied. The
 * command palette is now a proper combobox+listbox: focus stays in the input
 * while the arrow keys move an `aria-activedescendant`, results carry
 * `role="option"` + `aria-selected`, and screen readers can track the highlight
 * without DOM focus moving into the list. No seed data — pure client behaviour.
 */
test.describe('a11y — command palette combobox', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('midnite.theme', 'dark');
      } catch {
        // best effort
      }
    });
  });

  test('input is a combobox wired to a listbox; arrows move aria-activedescendant', async ({ page }) => {
    await page.goto('/dashboard');

    const palette = await openPalette(page);

    const input = palette.getByRole('combobox', { name: 'Search commands and content' });
    await expect(input).toHaveAttribute('aria-controls', 'command-palette-listbox');
    await expect(input).toHaveAttribute('aria-expanded', 'true');

    // The results are a listbox of options (always-on Commands/Navigation).
    const listbox = palette.getByRole('listbox', { name: 'Results' });
    await expect(listbox).toBeVisible();
    expect(await palette.getByRole('option').count()).toBeGreaterThan(1);

    // Focus stays in the input; ArrowDown advances the active descendant, and the
    // pointed-to element is a selected option that actually exists.
    await input.press('ArrowDown');
    await expect(input).toBeFocused();
    const active = await input.getAttribute('aria-activedescendant');
    expect(active).toMatch(/^command-palette-option-\d+$/);
    const activeOption = page.locator(`#${active}`);
    await expect(activeOption).toHaveAttribute('role', 'option');
    await expect(activeOption).toHaveAttribute('aria-selected', 'true');

    // ArrowDown again moves the highlight to a different option.
    await input.press('ArrowDown');
    await expect(input).not.toHaveAttribute('aria-activedescendant', active!);

    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
  });
});

/**
 * Phase 67 B/E — the product-guide overlay is keyboard-operable: it's a modal
 * dialog, focus lands on the step card, ←/→/Enter/Esc drive the tour, and Escape
 * dismisses it. Launched via the assistant → "Guides" index.
 *
 * Needs one seeded task: an empty board replaces the whole column grid with an
 * empty state (`board-view.tsx`), so with no tasks there is no `Todo` heading
 * and no `board-column-todo` tour anchor to measure.
 */
test.describe('a11y — guide overlay keyboard nav', () => {
  test.beforeEach(async ({ page }) => {
    // The tour must be launched deliberately below, not auto-shown on arrival.
    await mergeSettings(page, { autoShowGuides: false });
    // The board defaults to per-project accordions, which repeat the status
    // columns once per project — so `Todo` below must resolve to exactly one
    // heading regardless of what other specs left in the shared gateway.
    await pinUnifiedBoard(page);
    await page.addInitScript(() => {
      try {
        localStorage.setItem('midnite.theme', 'dark');
      } catch {
        // best effort
      }
    });
  });

  test('overlay is a focused modal dialog driven by arrows/Enter/Escape', async ({ page }) => {
    // Seed before navigating: the board paints an empty state instead of columns
    // until at least one task exists, and this spec must not depend on whatever
    // another spec happened to leave in the shared gateway.
    await seedTask(uniqueLabel('E2E guide overlay — board anchor'), 'todo');

    await page.goto('/tasks');
    // Wait for the board itself before launching its tour. The overlay's
    // missing-anchor handling *advances* rather than stranding the user on an
    // invisible step (`guide-overlay.tsx` `measure()`), so starting the tour
    // before the client-side board has painted silently skips both
    // board-anchored steps and lands on the closing one.
    await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();

    // Open the assistant → all-guides index → the board tour.
    await page.getByRole('button', { name: 'Open assistant' }).click();
    await page.getByRole('button', { name: /Guides/i }).click();
    await page
      .getByRole('button')
      .filter({ has: page.getByText('Board tour', { exact: true }) })
      .first()
      .click();

    // The overlay is a modal dialog; the step card takes focus for keyboard nav.
    const overlay = page.getByRole('dialog', { name: 'Your board' });
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveAttribute('aria-modal', 'true');

    // ArrowRight advances a step at a time. The board tour is three steps —
    // "Your board" → "Ready work" → the closing "Replay anytime" — and the
    // middle anchor (`data-tour="board-column-todo"`) is rendered because the
    // board has the seeded task above, so the overlay's missing-anchor auto-skip
    // never collapses it.
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('dialog', { name: 'Ready work' })).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('dialog', { name: 'Replay anytime' })).toBeVisible();

    // ArrowLeft steps back.
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('dialog', { name: 'Ready work' })).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('dialog', { name: 'Your board' })).toBeVisible();

    // Escape dismisses the tour entirely.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Your board' })).toBeHidden();
  });
});
