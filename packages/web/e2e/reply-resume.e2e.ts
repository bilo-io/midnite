import { expect, test } from '@playwright/test';

import { GATEWAY_ORIGIN } from './config';
import { column } from './helpers/board';
import { seedTask } from './helpers/gateway';

/**
 * Phase 69 Verification (the whole point) — the reply→resume round-trip end to
 * end against a real, driveable agent session. A stub `claude`
 * (`e2e/fixtures/stub-agent/claude`, on the gateway PATH) spawns via
 * `POST /tasks/:id/start`, fires the Notification hook (→ `waiting`), and — when a
 * reply hits its stdin (`POST /sessions/:id/prompt` from the board's reply box) —
 * fires the `UserPromptSubmit` hook (→ `wip`). The status flip is *earned* by that
 * hook round-trip; the board card moves without a reload, driven by the WS event.
 */

async function startRun(id: string): Promise<void> {
  const res = await fetch(`${GATEWAY_ORIGIN}/tasks/${id}/start`, { method: 'POST' });
  if (!res.ok) throw new Error(`start failed (${res.status}): ${await res.text().catch(() => '')}`);
}

async function waitForStatus(id: string, status: string, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${GATEWAY_ORIGIN}/tasks/${id}`);
    if (res.ok) {
      const body = (await res.json()) as { status?: string; task?: { status?: string } };
      if ((body.task?.status ?? body.status) === status) return;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`task ${id} never reached status "${status}"`);
}

test('reply to a waiting agent from the board card → resumes to In progress (no reload)', async ({
  page,
}) => {
  const task = await seedTask('E2E reply-resume — waiting agent', 'todo');

  // Spawn the stub agent (works with the pool disabled — the slot pool is
  // independent of the scheduler) and wait for its Notification hook to park the
  // task in `waiting`.
  await startRun(task.id);
  await waitForStatus(task.id, 'waiting');

  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      // storage unavailable — harmless
    }
  });
  await page.goto('/tasks');

  // The card sits in Waiting with the live-wait quick-reply affordance.
  const waitingCol = column(page, 'Waiting');
  await expect(waitingCol.getByText(task.title)).toBeVisible();

  await page.getByRole('button', { name: 'Reply', exact: true }).click();
  await page.getByLabel('Reply to the agent').fill('continue please');
  await page.getByRole('button', { name: 'Send reply' }).click();

  // The hook round-trip (sendPrompt → stub stdin → UserPromptSubmit →
  // resumeFromWaiting) moves the card into In progress — no page reload.
  await expect(column(page, 'In progress').getByText(task.title)).toBeVisible({ timeout: 20_000 });
  await expect(waitingCol.getByText(task.title)).toHaveCount(0);
});
