import { expect, test } from '@playwright/test';

/**
 * Slides is a fully client-side feature: decks live in localStorage (no gateway).
 * These flows drive the real UI — create-by-pasting-Markdown, the list surface,
 * and the typewriter presenter — with no server seeding.
 */
test.describe('Slides', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress the setup wizard + idle screensaver so they don't intercept clicks,
    // and start from an initialized-but-empty deck store (no first-run seed).
    await page.addInitScript(() => {
      try {
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86400 }));
        localStorage.setItem('midnite.slides.decks', '[]');
      } catch {
        // best effort
      }
    });
  });

  test('creates a deck by pasting Markdown and presents it with a typing title', async ({ page }) => {
    await page.goto('/slides/new');

    await page.getByLabel('Deck title').fill('E2E Deck');
    await page
      .getByLabel('Deck markdown source')
      .fill('# E2E Deck\n\n## One\n\n- alpha\n\n## Two\n\n- beta');

    // The parsed-slide footer reflects the three slides (cover + One + Two).
    await expect(page.getByText('3', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Create deck' }).click();

    // Lands in the fullscreen presenter for the new deck (trailingSlash on).
    await expect(page).toHaveURL(/\/slides\/present\/?\?slug=e2e-deck/);
    // The cover title types itself in; assert it settles on the full text.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Deck');
    await expect(page.getByText('1 / 3')).toBeVisible();

    // Advancing moves through the deck.
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('2 / 3')).toBeVisible();
  });

  test('lists a created deck and opens it from a card', async ({ page }) => {
    // Create one through the UI, then it appears on the list.
    await page.goto('/slides/new');
    await page.getByLabel('Deck title').fill('Listed Deck');
    await page.getByLabel('Deck markdown source').fill('# Listed Deck\n\n## Body\n\n- point');
    await page.getByRole('button', { name: 'Create deck' }).click();
    await expect(page).toHaveURL(/\/slides\/present/);

    await page.goto('/slides');
    await expect(page.getByRole('heading', { name: 'Slides', exact: true })).toBeVisible();
    const card = page.getByRole('link', { name: /present listed deck/i }).first();
    await expect(card).toBeVisible();

    // The grid/list toggles are present.
    await expect(page.getByRole('button', { name: /grid view/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /list view/i })).toBeVisible();

    // Opening the card enters the presenter.
    await card.click();
    await expect(page).toHaveURL(/\/slides\/present/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Listed Deck');
  });
});
