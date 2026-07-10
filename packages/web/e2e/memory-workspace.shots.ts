import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedMemory } from './helpers/gateway';

// Phase 65 A — preview shots of the memory workspace (not baseline assertions):
// the 3-panel layout (sources rail · doc + chat composer · Studio rail), dark + light.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

const CONTENT = `# Coding conventions

- Use TypeScript strict mode everywhere.
- Prefer \`type\` over \`interface\` for object shapes.
- Every wire payload has a zod schema in \`shared\`.

These are the rules agents should carry into every session.`;

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

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

for (const scheme of ['dark', 'light'] as const) {
  test(`memory workspace — 3-panel (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const memory = await seedMemory(`Workspace preview ${scheme}`, CONTENT);
    await page.goto(`/memory/view?id=${memory.id}`);

    await expect(page.getByRole('heading', { name: memory.title })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Studio' })).toBeVisible();

    // Phase 65 B — upload a file source so the shot shows the ingestion UI
    // (upload affordance + a "read" file source in the left rail).
    await page.locator('input[type="file"]').setInputFiles({
      name: 'conventions.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Conventions\nUse tabs, not spaces.'),
    });
    await expect(page.getByLabel('Source read')).toBeVisible({ timeout: 15_000 });

    // The header title + description type out via a typewriter — let them settle
    // so the preview shot shows the full title, not a mid-animation frame.
    await expect(page.getByRole('heading', { name: memory.title })).toHaveText(memory.title);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(OUT, `memory-workspace-${scheme}.png`), fullPage: true });
  });
}
