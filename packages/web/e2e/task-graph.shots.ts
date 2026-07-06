import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedDependency, seedTask } from './helpers/gateway';

// Phase 58 B — preview shots of the dependency DAG (not baseline assertions):
// a small blocker chain laid out left-to-right, in dark + light.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  // A → B → C chain plus a second dependent, so the graph shows real fan-out.
  const [a, b, c, d] = await Promise.all([
    seedTask('Design the graph API', 'done'),
    seedTask('Build the DAG view', 'todo'),
    seedTask('Ship the roadmap', 'todo'),
    seedTask('Wire the entry points', 'todo'),
  ]);
  await seedDependency(b.id, a.id);
  await seedDependency(c.id, b.id);
  await seedDependency(d.id, b.id);
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
  test(`dependency graph (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/tasks/graph');

    await expect(page.getByRole('heading', { name: 'Dependency graph' })).toBeVisible();
    await expect(page.getByText('Build the DAG view')).toBeVisible();
    // Give React Flow's fitView a beat to settle the transform before capturing.
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `task-graph-${scheme}.png`), fullPage: true });
  });
}
