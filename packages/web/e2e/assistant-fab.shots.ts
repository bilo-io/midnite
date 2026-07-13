import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 66 A/B/C/D — capture the logo assistant FAB and its expanded panel in
 * light + dark: rest state, hover glow (Theme B), the four-entry menu (Guide +
 * Agent disabled), and the relocated chat-to-board view (Theme D). No seeded
 * data needed — the FAB lives in the app shell.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

for (const scheme of ['light', 'dark'] as const) {
  test(`assistant FAB — ${scheme}`, async ({ page }) => {
    await page.addInitScript((s) => {
      try {
        localStorage.setItem('midnite.theme', s);
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86_400 }));
      } catch {
        // storage unavailable — colorScheme is the fallback
      }
    }, scheme);
    await page.emulateMedia({ colorScheme: scheme });

    await page.goto('/dashboard');
    const fab = page.getByRole('button', { name: 'Open assistant' });
    await fab.waitFor({ state: 'visible' });

    // Rest + hover (glow lights on hover — Theme B).
    await page.screenshot({ path: `${OUT}/assistant-fab-rest-${scheme}.png` });
    await fab.hover();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/assistant-fab-hover-${scheme}.png` });

    // Expanded panel — the four entries (Guide + Agent disabled).
    await fab.click();
    await page.getByRole('dialog', { name: 'Assistant' }).waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/assistant-panel-menu-${scheme}.png` });

    // Chat-to-board view (Theme D).
    await page.getByRole('button', { name: /Chat to board/i }).click();
    await page.getByTestId('chat-bar').waitFor({ state: 'visible' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/assistant-panel-chat-${scheme}.png` });
  });
}
