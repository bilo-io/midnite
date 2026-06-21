import { expect, test } from '@playwright/test';

/**
 * The office is a Phaser canvas with a React HUD overlay, loaded client-only.
 * Per Phase 10 Theme D we drive/assert the HUD + store-driven DOM, not pixels.
 * Proximity interactions (walking to the board room / library / coffee break)
 * need deterministic Phaser physics control and are left to a follow-up — they're
 * covered at the component level by the office-HUD stories (Phase 10 C2).
 */
test.describe('Office', () => {
  test('mounts the Phaser canvas and HUD against the live gateway', async ({ page }) => {
    await page.goto('/office');

    await expect(page.getByRole('heading', { name: 'Office', exact: true })).toBeVisible();

    // HUD overlay (React) renders regardless of the canvas; its controls hint is
    // always present.
    await expect(page.getByText(/to interact/i)).toBeVisible();

    // The online count comes from the live-data hook reading the gateway's
    // sessions. No agents are seeded, so the office is empty.
    await expect(page.getByText('0 agents online')).toBeVisible();

    // The Phaser game mounts a <canvas> into the stage (creation is deferred a
    // tick to dodge StrictMode double-mount, hence the generous timeout).
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
  });
});
