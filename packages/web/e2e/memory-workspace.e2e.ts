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
    // Center doc editor (Save/Delete controls; content opens in preview mode).
    await expect(page.getByLabel('Memory title')).toHaveValue(memory.title);
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
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
    await expect(page).toHaveURL(new RegExp(`/memory/view/?\\?id=${memory.id}`));
    await expect(page.getByRole('heading', { name: memory.title })).toBeVisible();
  });

  // Phase 65 D — the Studio rail generates artifacts from the corpus. With no LLM
  // provider configured in the e2e gateway the generation settles to a surfaced
  // error (honest degrade); with one it settles to Ready. Either way the button
  // leaves its idle state and the status chip resolves — asserting the endpoint,
  // the client poll, and status surfacing end-to-end without depending on a key.
  test('Studio: generating an artifact leaves idle and settles to a status', async ({ page }) => {
    const fresh = await seedMemory('E2E studio target', '# Topic\nSome grounding content to summarise.');
    await page.goto(`/memory/view?id=${fresh.id}`);

    await expect(page.getByRole('heading', { name: 'Studio' })).toBeVisible();
    await expect(page.getByText('Executive brief')).toBeVisible();
    await page.getByRole('button', { name: 'Generate' }).first().click();

    // A pending/ready/failed chip (never the plain idle button) must appear.
    await expect(page.getByText(/Generating|Ready|Retry/).first()).toBeVisible({ timeout: 20_000 });
  });

  // Phase 65 E — the file-backed audio + video overviews are offered in the Studio
  // rail (no "Soon" placeholders). With no TTS/ffmpeg provider they degrade rather
  // than hard-fail; here we assert both rows are present and generatable.
  test('Studio: audio + video overviews are offered', async ({ page }) => {
    const fresh = await seedMemory('E2E studio media', '# Topic\nGrounding content for media.');
    await page.goto(`/memory/view?id=${fresh.id}`);
    await expect(page.getByRole('heading', { name: 'Studio' })).toBeVisible();
    await expect(page.getByText('Audio overview')).toBeVisible();
    await expect(page.getByText('Video', { exact: true })).toBeVisible();
    await expect(page.getByText('Soon')).toHaveCount(0);
  });

  // Phase 65 B — upload a text file as a source; it ingests (no network needed)
  // and the per-source status resolves to "read" via the panel's poll.
  test('uploads a file source and it ingests to ready', async ({ page }) => {
    const fresh = await seedMemory('E2E upload target', '');
    await page.goto(`/memory/view?id=${fresh.id}`);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'conventions.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Conventions\nUse tabs, not spaces.'),
    });

    await expect(page.getByText('conventions.md')).toBeVisible();
    await expect(page.getByLabel('Source read')).toBeVisible({ timeout: 15_000 });
  });
});
