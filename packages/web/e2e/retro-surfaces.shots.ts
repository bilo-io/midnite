import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedTask, type SeededTask } from './helpers/gateway';

/**
 * Phase 62 F — preview shot + functional coverage of the task-detail
 * Retrospective tab. We seed a real *terminal* task (so the Retro tab appears —
 * it's gated on the task being done/abandoned) and route-mock its
 * `GET /tasks/:id/retro` with a rich narrative fixture so the deterministic
 * chart-free render is stable. (The data path is covered by shared, gateway, and
 * RTL unit tests.)
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
const DESKTOP = { width: 1440, height: 900 };

function retroFixture(taskId: string) {
  return {
    retro: {
      taskId,
      outcome: 'done',
      timeline: [
        { at: '2026-07-10T09:00:00.000Z', kind: 'status.changed', detail: 'todo → wip' },
        { at: '2026-07-10T09:32:00.000Z', kind: 'agent.completed' },
        { at: '2026-07-10T09:33:00.000Z', kind: 'status.changed', detail: 'wip → done' },
      ],
      attempts: [
        {
          startedAt: '2026-07-10T09:00:00.000Z',
          endedAt: '2026-07-10T09:20:00.000Z',
          durationMs: 1_200_000,
          outcome: 'failed',
          retryIndex: 0,
        },
        {
          startedAt: '2026-07-10T09:22:00.000Z',
          endedAt: '2026-07-10T09:33:00.000Z',
          durationMs: 660_000,
          outcome: 'done',
          retryIndex: 1,
        },
      ],
      failures: [],
      checks: { status: 'passed', passed: 4, failed: 0 },
      review: { verdict: 'approved', summary: 'Clean, well-tested change.' },
      prUrl: 'https://github.com/bilo-io/midnite/pull/400',
      durations: { waitMs: 120_000, workMs: 1_980_000, totalMs: 2_100_000 },
      narrative: {
        whatHappened:
          'Added two Ops cost charts — a stacked spend-over-time area and a by-dimension breakdown — reusing the existing rollup and attribution endpoints.',
        whatTrippedIt: 'A first attempt hit a flaky recharts jsdom size warning; the retry passed.',
        notable: ['No new gateway endpoint needed', 'Honesty split kept in the stack'],
        generatedBy: 'llm',
      },
      createdAt: '2026-07-10T09:34:00.000Z',
    },
  };
}

let retroTask: SeededTask;

test.use({ colorScheme: 'dark', viewport: DESKTOP });

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  retroTask = await seedTask('E2E — retrospective surface', 'done');
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem('midnite.theme', 'dark');
    } catch {
      /* best effort */
    }
  });
});

test('Task detail → Retrospective tab', async ({ page }) => {
  await page.route(`**/tasks/${retroTask.id}/retro`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(retroFixture(retroTask.id)),
    }),
  );

  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto(`/tasks/view?id=${retroTask.id}&tab=retro`);

  // The Retro tab is selected and its content renders.
  await expect(page.getByRole('tab', { name: 'Retro' })).toBeVisible();
  await expect(page.getByText('AI summary')).toBeVisible();
  await expect(page.getByText('Shipped', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Timing' })).toBeVisible();
  await expect(page.getByText('Retry 1')).toBeVisible();

  await page.screenshot({ path: join(OUT, 'task-retro-tab.png'), fullPage: true });
});
