import { type Locator, type Page } from '@playwright/test';

/**
 * The board renders one `<section>` per status, each with a heading carrying the
 * column label. Scope card lookups to a column so the same task title can be
 * asserted "in Backlog" vs "in Todo".
 */
export function column(page: Page, label: string): Locator {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: label, exact: true }) });
}

/**
 * Drag a dnd-kit card onto a droppable column. dnd-kit's `PointerSensor` has a
 * 6px activation distance, so a one-shot drag that teleports the cursor never
 * starts the drag — hand-drive the pointer instead: press, nudge past the
 * threshold, travel to the target in steps (each `pointermove` lets dnd-kit's
 * collision detection register the `over` droppable), then release near the top
 * of the target column.
 */
export async function dragCardTo(page: Page, source: Locator, target: Locator): Promise<void> {
  const src = await source.boundingBox();
  const dst = await target.boundingBox();
  if (!src || !dst) throw new Error('drag source/target has no bounding box');

  const startX = src.x + src.width / 2;
  const startY = src.y + src.height / 2;
  const endX = dst.x + dst.width / 2;
  // Aim near the top of the column (its header), well inside the droppable rect.
  const endY = dst.y + Math.min(dst.height / 2, 64);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Cross the activation distance, then travel to the target column.
  await page.mouse.move(startX + 12, startY + 12, { steps: 6 });
  await page.mouse.move(endX, endY, { steps: 16 });
  await page.mouse.move(endX, endY, { steps: 4 });
  await page.mouse.up();
}
