import { type Locator, type Page } from '@playwright/test';

/**
 * Pin the tasks board to its **unified** layout ("One board" on) before the app
 * boots. The board defaults to *per-project* accordions, which nest a set of
 * status columns per project — so `column()` would match one section per project
 * group. Every spec asserting flat, page-level status columns depends on the
 * unified layout, and says so by calling this in a `beforeEach`.
 */
export async function pinUnifiedBoard(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.tasks.boardStyle', 'unified');
    } catch {
      /* best effort */
    }
  });
}

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
  // Scroll the card into view first. `boundingBox()` is viewport-relative and the
  // board is an un-windowed, page-scrolling list, so by the time the whole suite
  // has seeded its fixtures into one shared gateway the card can sit well below
  // the fold — and `page.mouse` would then press on empty space. (This is exactly
  // why the drag passed in isolation but failed in a full run.)
  await source.scrollIntoViewIfNeeded();

  const src = await source.boundingBox();
  const dst = await target.boundingBox();
  if (!src || !dst) throw new Error('drag source/target has no bounding box');

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport size');

  const startX = src.x + src.width / 2;
  const startY = src.y + src.height / 2;
  const endX = dst.x + dst.width / 2;
  // Aim near the top of the column (its header), well inside the droppable rect —
  // then clamp into the viewport, since a tall column's own top may be scrolled
  // off and dropping outside it cancels the drag rather than moving the card.
  const endY = Math.min(
    Math.max(dst.y + Math.min(dst.height / 2, 64), 8),
    Math.min(dst.y + dst.height - 8, viewport.height - 8),
  );

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Cross the activation distance, then travel to the target column.
  await page.mouse.move(startX + 12, startY + 12, { steps: 6 });
  await page.mouse.move(endX, endY, { steps: 16 });
  await page.mouse.move(endX, endY, { steps: 4 });
  await page.mouse.up();
}
