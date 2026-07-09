import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

// Phase 64 Theme G — preview shots of proximity chat: the composer open in the
// office HUD, and a sent message rendered as a self bubble over the player.
// Preview PNGs only (page.screenshot to e2e/__shots__/), no committed baseline.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86400 }));
    } catch {
      /* best effort */
    }
  });
});

test('office proximity chat: composer + self bubble', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/office');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });

  // Dismiss the first-visit guest-name prompt so it doesn't cover the scene.
  const useDefault = page.getByRole('button', { name: 'Use default' });
  if (await useDefault.isVisible().catch(() => false)) await useDefault.click();

  // Bring the bottom-left HUD into view (it sits at the foot of the tall panel).
  await page.getByRole('button', { name: 'Emote' }).scrollIntoViewIfNeeded();

  // Open the composer with the `T` shortcut and type a message.
  await page.keyboard.press('t');
  const input = page.getByRole('textbox', { name: 'Chat message' });
  await expect(input).toBeVisible();
  await input.scrollIntoViewIfNeeded();
  await input.fill('hey team 👋 shipping proximity chat!');
  await page.screenshot({ path: join(OUT, 'office-chat-composer.png') });

  // Send it — the message renders optimistically as a bubble over your avatar.
  // Shoot the canvas itself (camera-centred on the player) so the bubble frames
  // regardless of page scroll.
  await input.press('Enter');
  await page.waitForTimeout(500); // let the scene draw the self bubble
  await page.locator('canvas').screenshot({ path: join(OUT, 'office-chat-self-bubble.png') });
});
