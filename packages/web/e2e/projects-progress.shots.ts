import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import type { Status } from '@midnite/shared';

import { GATEWAY_ORIGIN, SCREENSHOTS_DIR } from './config';
import { seedProject } from './helpers/gateway';

// Phase 58 Theme C — preview shots (not baseline assertions) of the per-project
// completion overlay: the progress bar on the projects list/grid cards and the
// project detail stats panel. Seeds a project with a mixed-status task set so the
// bar shows a partial (non-0/non-100) fill.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

/** Assign a mixed-status task set to a project via POST /tasks (projectId + status). */
async function seedTaskForProject(projectId: string, prompt: string, status: Status): Promise<void> {
  const form = new FormData();
  form.set('prompt', prompt);
  form.set('status', status);
  form.set('projectId', projectId);
  const res = await fetch(`${GATEWAY_ORIGIN}/tasks`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`seed task failed (${res.status})`);
}

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
  test(`project completion overlay (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const project = await seedProject(`Progress preview ${scheme}`, 'Ship the completion overlay');
    // 3 done of 6 total (abandoned counts toward the total) → 50%.
    const statuses: Status[] = ['done', 'done', 'done', 'wip', 'todo', 'abandoned'];
    for (const [i, status] of statuses.entries()) {
      await seedTaskForProject(project.id, `Task ${i + 1}`, status);
    }

    // Projects list — the cards carry the bar.
    await page.goto('/projects');
    await expect(page.getByText(project.name)).toBeVisible();
    await page.screenshot({ path: join(OUT, `projects-progress-list-${scheme}.png`), fullPage: true });

    // Project detail — the stats panel bar.
    await page.goto(`/projects/view?id=${project.id}`);
    await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
    await expect(page.getByText('3 done')).toBeVisible();
    await page.screenshot({ path: join(OUT, `projects-progress-detail-${scheme}.png`), fullPage: true });
  });
}
