import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedIdea } from './helpers/gateway';

/**
 * Idea chat composer (Phase 42 Theme A) against the live gateway.
 *
 * The e2e gateway runs with no LLM credential, so the assistant reply is the
 * deterministic "AI is not configured" fallback — which is exactly what makes
 * the round-trip assertable without mocking. The flow proves: the drawer opens
 * from ?chat=open, sending a message persists both turns, history restores on
 * reload, and "Apply to idea" writes the assistant body back + flips the status
 * chip to Refined.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

// Keep the first-run setup nudge off the capture / out of the way, and enable
// the Ideas feature — it's opt-in (off by default since Phase 40), so without
// this the routes render the "Ideas is disabled" gate instead of the composer.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    window.localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
    window.localStorage.setItem('midnite.settings', JSON.stringify({ features: { ideas: true } }));
  });
});

test('opens the chat drawer, persists a turn, and applies the refined body', async ({ page }) => {
  const idea = await seedIdea(`E2E chat idea ${Date.now()}`, 'A rough first sketch.');

  await page.goto(`/ideas/view?id=${idea.id}&chat=open`);

  const drawer = page.getByRole('dialog', { name: /Refine idea/ });
  await expect(drawer).toBeVisible();

  // Send a message; the user bubble + the (disabled) assistant reply both land.
  // `exact` so "Message" doesn't also match the "Send message" button.
  await drawer.getByLabel('Message', { exact: true }).fill('Make it sharper and add a target user.');
  await drawer.getByLabel('Send message').click();
  await expect(drawer.getByText('Make it sharper and add a target user.')).toBeVisible();
  // Scope to the assistant bubble — the right-hand "Refined body preview" echoes
  // the same reply, so an unscoped getByText would match twice.
  await expect(drawer.locator('[data-role="assistant"]')).toContainText(/AI is not configured/);

  // Capture the drawer open with a live thread.
  await page.screenshot({ path: resolve(OUT, 'idea-chat-drawer.png') });

  // History restores after a reload (server-backed thread).
  await page.reload();
  await expect(
    page.getByRole('dialog', { name: /Refine idea/ }).getByText('Make it sharper and add a target user.'),
  ).toBeVisible();

  // Apply writes the assistant body back and flips status → Refined.
  await page.getByRole('button', { name: /Apply to idea/i }).click();
  await page.getByRole('dialog', { name: /Refine idea/ }).getByLabel('Close').click();
  await expect(page.getByRole('dialog', { name: /Refine idea/ })).toBeHidden();
  // `exact` so the status chip isn't confused with the drawer's "Refined body preview".
  await expect(page.getByText('Refined', { exact: true })).toBeVisible();
});

test('+ New idea creates a draft and lands straight in the chat composer', async ({ page }) => {
  await page.goto('/ideas');
  await page.getByRole('button', { name: 'New idea' }).click();

  // Routed to a fresh idea detail with the drawer auto-opened (?chat=open).
  await expect(page).toHaveURL(/\/ideas\/view\/?\?id=[^&]+&chat=open/);
  await expect(page.getByRole('dialog', { name: /Refine idea/ })).toBeVisible();

  await page.screenshot({ path: resolve(OUT, 'idea-new-flow.png') });
});
