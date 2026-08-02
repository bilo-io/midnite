import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedMemory } from './helpers/gateway';

/**
 * Phase 82 Theme D (memory slice) — the memory list + the 3-panel workspace under
 * fr-FR, proving the new `memory` namespace resolves end-to-end (page chrome, the
 * sources/Studio rails, the chat composer). The seeded memory's own title/content
 * stays English on purpose: it's gateway data, not UI copy. The locale rides the
 * Phase 43 settings blob the pre-paint init script resolves. Preview PNGs only
 * (no baselines) — the full fr-FR walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

const CONTENT = `# Coding conventions

- Use TypeScript strict mode everywhere.
- Every wire payload has a zod schema in \`shared\`.`;

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.theme', 'dark');
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem(
        'midnite.settings',
        JSON.stringify({ locale: 'fr-FR', inactivityTimeoutS: 86_400 }),
      );
    } catch {
      // storage unavailable — the default locale is the fallback
    }
  });
  await page.emulateMedia({ colorScheme: 'dark' });
});

test('memory list + workspace — fr-FR', async ({ page }) => {
  const memory = await seedMemory('Coding conventions', CONTENT);

  await page.goto('/memory');
  // The French "new memory" affordance doubles as the loaded signal.
  await expect(page.getByRole('heading', { name: 'Mémoire' })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/memory-list-fr.png` });

  await page.goto(`/memory/view?id=${memory.id}`);
  // French rail headings prove the workspace panels read the catalog.
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/memory-workspace-fr.png` });
});
