import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { assignMilestone, seedMilestone, seedProject, seedTask } from './helpers/gateway';

// Phase 58 E — preview shots of the roadmap tab (not baseline assertions):
// milestone lanes with progress + a backlog, in dark + light.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
let projectId: string;

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  const project = await seedProject('Roadmap preview', 'Ship the roadmap');
  projectId = project.id;
  const [design, build] = await Promise.all([
    seedMilestone(projectId, 'Design'),
    seedMilestone(projectId, 'Build'),
  ]);
  const tasks = await Promise.all([
    seedTask('Draft the milestone model', 'done', { projectId }),
    seedTask('Wire the roadmap API', 'done', { projectId }),
    seedTask('Build the lane view', 'wip', { projectId }),
    seedTask('Drag-to-assign', 'todo', { projectId }),
    seedTask('Polish + a11y pass', 'todo', { projectId }),
  ]);
  await Promise.all([
    assignMilestone(tasks[0].id, design.id),
    assignMilestone(tasks[1].id, design.id),
    assignMilestone(tasks[2].id, build.id),
    assignMilestone(tasks[3].id, build.id),
    // tasks[4] stays in the backlog
  ]);
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
  test(`project roadmap (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`/projects/view?id=${projectId}&tab=roadmap`);
    await expect(page.getByRole('heading', { name: 'Design' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Backlog' })).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `roadmap-${scheme}.png`), fullPage: true });
  });
}
