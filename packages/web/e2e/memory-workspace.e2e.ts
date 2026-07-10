import { expect, test } from '@playwright/test';

import { seedMemory, type SeededMemory } from './helpers/gateway';

// Phase 65 A — the shareable `/memory/view?id=` workspace. Direct navigation /
// refresh must render the 3-panel layout (output: 'export' can't prerender ids,
// so the id rides the query string and the view fetches it client-side). The
// memory-list cards navigate here; an unknown id shows an inline not-found.
let memory: SeededMemory;

test.beforeAll(async () => {
  memory = await seedMemory('E2E memory — workspace', '# Notes\nRemember the conventions.');
});

// The first-run setup wizard renders a modal overlay that would intercept clicks.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      /* best effort */
    }
  });
});

test.describe('Memory workspace page', () => {
  test('direct link renders the 3-panel workspace: doc, sources, Studio', async ({ page }) => {
    await page.goto(`/memory/view?id=${memory.id}`);

    await expect(page.getByRole('heading', { name: memory.title })).toBeVisible();
    // Center doc editor.
    await expect(page.getByLabel('Memory title')).toHaveValue(memory.title);
    await expect(page.getByLabel('Memory content')).toBeVisible();
    // Left sources rail + right Studio rail.
    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Studio' })).toBeVisible();
    // Chat composer scaffold (disabled).
    await expect(page.getByLabel('Ask this memory a question')).toBeDisabled();
  });

  test('a rail collapses to a slim toggle and re-expands', async ({ page }) => {
    await page.goto(`/memory/view?id=${memory.id}`);
    await page.getByRole('button', { name: 'Collapse Sources' }).click();
    await expect(page.getByRole('button', { name: 'Expand Sources' })).toBeVisible();
    await page.getByRole('button', { name: 'Expand Sources' }).click();
    await expect(page.getByRole('button', { name: 'Collapse Sources' })).toBeVisible();
  });

  test('an unknown id shows an inline not-found + back link', async ({ page }) => {
    await page.goto('/memory/view?id=does-not-exist');
    await expect(page.getByText('Memory not found.')).toBeVisible();
    await page.getByRole('link', { name: /All memories/i }).click();
    await expect(page).toHaveURL(/\/memory\/?$/);
  });

  test('a list card navigates to the workspace page', async ({ page }) => {
    await page.goto('/memory');
    await page.getByText(memory.title).first().click();
    await expect(page).toHaveURL(new RegExp(`/memory/view\\?id=${memory.id}`));
    await expect(page.getByRole('heading', { name: memory.title })).toBeVisible();
  });
});
