import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedDependency, seedProject, seedTask } from './helpers/gateway';

// Phase 58 B/C — preview shots of the dependency DAG (not baseline assertions):
// a small blocker chain laid out left-to-right, project-scoped so the Phase 58 C
// per-project completion bar shows in the toolbar. Dark + light.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
let shotProjectId: string;

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  const project = await seedProject('Graph preview', 'Ship the graph');
  shotProjectId = project.id;
  // A → B → C chain plus a second dependent, so the graph shows real fan-out.
  const [a, b, c, d] = await Promise.all([
    seedTask('Design the graph API', 'done', { projectId: shotProjectId }),
    seedTask('Build the DAG view', 'todo', { projectId: shotProjectId }),
    seedTask('Ship the roadmap', 'todo', { projectId: shotProjectId }),
    seedTask('Wire the entry points', 'todo', { projectId: shotProjectId }),
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
    await page.goto(`/tasks/graph?projectId=${shotProjectId}`);

    await expect(page.getByRole('heading', { name: 'Dependency graph' })).toBeVisible();
    await expect(page.getByText('Build the DAG view')).toBeVisible();
    // Phase 58 C — the per-project completion bar (1 of 4 done → 25%).
    await expect(page.getByText('1/4 · 25%')).toBeVisible();
    // Give React Flow's fitView a beat to settle the transform before capturing.
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `task-graph-${scheme}.png`), fullPage: true });
  });
}
