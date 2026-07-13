import { expect, test } from '@playwright/test';

import { GATEWAY_ORIGIN } from './config';
import {
  installTemplateBySlug,
  moveTaskStatus,
  runWorkflow,
  seedTask,
  type SeededTask,
} from './helpers/gateway';

/**
 * Phase 62 Verification — the retrospective + digest pipelines exercised
 * end-to-end against the REAL gateway (no route mocks). The shots specs
 * (retro-surfaces / digest-surfaces) render fixtures for stable screenshots; this
 * spec proves the actual data path:
 *  - A terminal transition auto-builds a retro skeleton (the bus-subscribed hook),
 *    surfaced on the task-detail Retro tab.
 *  - The seeded daily-digest template, installed + run, builds + stores a real
 *    digest that the /digests feed renders.
 */

test.describe('Retro pipeline (real)', () => {
  let task: SeededTask;

  test.beforeAll(async () => {
    // Create in `todo`, then MOVE to done — a create-in-column only emits
    // `task.created`; the retro subscriber fires on the `task.updated` transition.
    task = await seedTask('E2E retro pipeline — ship it', 'todo');
    await moveTaskStatus(task.id, 'done');
  });

  test('a terminal transition builds a real retro row', async () => {
    await expect
      .poll(
        async () => (await fetch(`${GATEWAY_ORIGIN}/tasks/${task.id}/retro`)).status,
        { timeout: 10_000 },
      )
      .toBe(200);
    const { retro } = (await (await fetch(`${GATEWAY_ORIGIN}/tasks/${task.id}/retro`)).json()) as {
      retro: { taskId: string; outcome: string; narrative: unknown };
    };
    expect(retro.taskId).toBe(task.id);
    expect(retro.outcome).toBe('done');
    expect(retro.narrative).toBeNull(); // no LLM in e2e → deterministic skeleton only
  });

  test('the task-detail Retro tab renders the real skeleton', async ({ page }) => {
    await page.goto(`/tasks/view?id=${task.id}&tab=retro`);
    // The outcome badge comes straight from the stored retro — no mock in play.
    await expect(page.getByText('Shipped').first()).toBeVisible();
    // The skeleton's timeline section is present.
    await expect(page.getByText('Timeline')).toBeVisible();
  });
});

test.describe('Digest pipeline (real)', () => {
  test.beforeAll(async () => {
    // A window of terminal tasks for the digest to roll up (one shipped, one
    // abandoned → needsAttention via the notable retro).
    const shipped = await seedTask('E2E digest — landed cleanly', 'todo');
    const failed = await seedTask('E2E digest — gave up', 'todo');
    await moveTaskStatus(shipped.id, 'done');
    await moveTaskStatus(failed.id, 'abandoned');

    // Install + run the seeded daily-digest template — the real workflow-first
    // pipeline (list-completed → build-digest → notify; Slack slot unbound → skips).
    const workflowId = await installTemplateBySlug('daily-digest');
    await runWorkflow(workflowId);
  });

  test('the pipeline stores a real digest the feed renders', async ({ page }) => {
    // The run executes asynchronously on the engine — poll until the digest lands.
    await expect
      .poll(
        async () => {
          const res = await fetch(`${GATEWAY_ORIGIN}/digests`);
          if (!res.ok) return 0;
          const { digests } = (await res.json()) as { digests: unknown[] };
          return digests.length;
        },
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);

    const { digests } = (await (await fetch(`${GATEWAY_ORIGIN}/digests`)).json()) as {
      digests: { id: string; headline: string; counts: { shipped: number; failed: number } }[];
    };
    const digest = digests[0]!;
    expect(digest.counts.shipped).toBeGreaterThanOrEqual(1);
    expect(digest.counts.failed).toBeGreaterThanOrEqual(1);

    // The feed renders the real digest (headline is the deterministic string —
    // no LLM in e2e), and the detail deep-link resolves.
    await page.goto(`/digests?id=${digest.id}`);
    await expect(page.getByText(/shipped/i).first()).toBeVisible();
  });
});
