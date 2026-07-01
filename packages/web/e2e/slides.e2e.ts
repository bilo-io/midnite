import { expect, test } from '@playwright/test';

import { seedDeck } from './helpers/gateway';

/**
 * Slides create→edit flow (Phase 48 Themes C–E). Drives the real UI against a
 * seeded gateway: the list surface, the /slides/new create path (which persists
 * on first save and swaps to the /slides/view?id= editor URL), and slide add.
 */
test.describe('Slides', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress the setup wizard + idle screensaver so they don't intercept clicks.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86400 }));
      } catch {
        // best effort
      }
    });
  });

  test('lists a seeded deck from the gateway', async ({ page }) => {
    const name = `Seeded deck ${Date.now()}`;
    await seedDeck(name, { slides: [{ id: 's1', format: 'md', content: '# Hello' }] });

    await page.goto('/slides');
    await expect(page.getByRole('heading', { name: 'Slides', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  });

  test('creates a deck via the editor and persists it', async ({ page }) => {
    await page.goto('/slides/new');

    const name = `New deck ${Date.now()}`;
    await page.getByLabel('Deck name').fill(name);

    const save = page.getByRole('button', { name: 'Save' });
    await expect(save).toBeEnabled();
    await save.click();

    // First save creates the deck and swaps to its stable editor URL.
    // (trailingSlash is on, so the route normalises to /slides/view/?id=…)
    await expect(page).toHaveURL(/\/slides\/view\/?\?id=/);
    await expect(page.getByText('Saved')).toBeVisible();

    // Add a second slide.
    await expect(page.getByText('Slides (1)')).toBeVisible();
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Slides (2)')).toBeVisible();

    // The new deck shows up back on the list.
    await page.goto('/slides');
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  });

  test('presents a deck fullscreen and offers exports', async ({ page }) => {
    const name = `Present deck ${Date.now()}`;
    const deck = await seedDeck(name, {
      slides: [
        { id: 's1', format: 'md', content: '# Present me\n\nreveal.js fullscreen.' },
        { id: 's2', format: 'md', content: '## Slide two' },
      ],
    });

    await page.goto(`/slides/present?id=${deck.id}`);

    // reveal renders the first slide fullscreen (its markdown becomes a heading).
    await expect(page.getByRole('heading', { name: 'Present me' })).toBeVisible();
    // The present toolbar exposes exit + both export affordances.
    await expect(page.getByRole('button', { name: 'Export PDF' })).toBeAttached();
    await expect(page.getByRole('button', { name: 'Export HTML' })).toBeAttached();
    // trailingSlash is on, so Link renders /slides/view/?id=…
    await expect(page.getByRole('link', { name: 'Exit present mode' })).toHaveAttribute(
      'href',
      new RegExp(`/slides/view/?\\?id=${deck.id}`),
    );

    // Standalone HTML export downloads a self-contained file.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export HTML' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.html$/);
  });
});
