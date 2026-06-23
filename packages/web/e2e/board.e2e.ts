import { expect, test } from '@playwright/test';

import { column, dragCardTo } from './helpers/board';
import { seedTask, type SeededTask } from './helpers/gateway';

// Seed distinct, spec-scoped tasks. The e2e gateway runs with the LLM off so the
// title is the prompt's first line — but we assert against the title the gateway
// actually returns (`SeededTask.title`), so the spec holds even if a run happens
// to have credentials and an AI rewrites the titles.
let todoAlpha: SeededTask;
let todoBravo: SeededTask;
let doneItem: SeededTask;
let backlogItem: SeededTask;

test.beforeAll(async () => {
  [todoAlpha, todoBravo, doneItem, backlogItem] = await Promise.all([
    seedTask('E2E board — todo alpha', 'todo'),
    seedTask('E2E board — todo bravo', 'todo'),
    seedTask('E2E board — shipped item', 'done'),
    seedTask('E2E board — parked item', 'backlog'),
  ]);
});

test.describe('Tasks board', () => {
  test('shows seeded tasks grouped into their status columns', async ({ page }) => {
    await page.goto('/tasks');

    // Board is the default view; wait for a column heading to confirm it rendered.
    await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();

    await expect(column(page, 'Todo').getByText(todoAlpha.title)).toBeVisible();
    await expect(column(page, 'Todo').getByText(todoBravo.title)).toBeVisible();
    await expect(column(page, 'Done').getByText(doneItem.title)).toBeVisible();
    await expect(column(page, 'Backlog').getByText(backlogItem.title)).toBeVisible();
  });

  test('dragging a card to another column persists across a reload', async ({ page }) => {
    await page.goto('/tasks');

    const todoCol = column(page, 'Todo');
    const backlogCol = column(page, 'Backlog');

    const card = todoCol.getByText(todoAlpha.title);
    await expect(card).toBeVisible();

    // Drag Todo → Backlog. This is a plain restatus (no agent spawn — only a move
    // into "In progress" would start a session), so it's safe with the pool off.
    await dragCardTo(page, card, backlogCol);

    // Optimistic move: it leaves Todo and lands in Backlog immediately.
    await expect(backlogCol.getByText(todoAlpha.title)).toBeVisible();
    await expect(todoCol.getByText(todoAlpha.title)).toHaveCount(0);

    // A reload re-fetches from the gateway, proving the move was persisted —
    // not just an optimistic UI update that a refresh would undo.
    await page.reload();
    await expect(column(page, 'Backlog').getByText(todoAlpha.title)).toBeVisible();
    await expect(column(page, 'Todo').getByText(todoAlpha.title)).toHaveCount(0);
  });
});
