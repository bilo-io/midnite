import { expect, test } from '@playwright/test';

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
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86400 }));
        localStorage.setItem('midnite.theme', 'dark');
      } catch {
        // best effort
      }
    });
  });

  test('input is a combobox wired to a listbox; arrows move aria-activedescendant', async ({ page }) => {
    await page.goto('/dashboard');

    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();

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
