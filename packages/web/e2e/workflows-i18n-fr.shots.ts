import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { GATEWAY_ORIGIN, SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme D (workflows slice) — the workflows list, the templates
 * marketplace and the editor (palette + config panel) under fr-FR, proving the
 * new `workflows` namespace resolves end-to-end: list/table chrome, template
 * marketplace chrome, palette category headings, and the node catalogue copy the
 * seam resolves from `shared` (`useNodeLabels`). The workflow's own name stays
 * English — that's user data, not UI copy. Preview PNGs only (no baselines) —
 * the full fr-FR walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

/** Create a workflow via `POST /workflows`, as the web client does. */
async function seedWorkflow(name: string): Promise<{ id: string }> {
  const res = await fetch(`${GATEWAY_ORIGIN}/workflows`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, description: 'Nightly digest fan-out' }),
  });
  if (!res.ok) {
    throw new Error(`seedWorkflow failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  const { workflow } = (await res.json()) as { workflow: { id: string } };
  return { id: workflow.id };
}

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

test('workflows list + templates + editor — fr-FR', async ({ page }) => {
  const workflow = await seedWorkflow('Digest fan-out');

  await page.goto('/workflows');
  await expect(page.getByRole('link', { name: /Modèles|Nouveau workflow/ }).first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/workflows-list-fr.png` });

  await page.goto('/workflows/templates');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/workflows-templates-fr.png` });

  // The editor: the palette's translated category headings + node catalogue copy.
  await page.goto(`/workflows/edit?id=${workflow.id}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/workflows-editor-fr.png` });
});
