import { expect, test, type Page } from '@playwright/test';

/**
 * Mobile chrome stacking — the regression suite for bilo-io/midnite-app#5
 * ("Mobile navbar behind nav menu").
 *
 * Every assertion here is **geometric**, deliberately: jsdom computes no layout,
 * so a unit test can only ever check that a class string is present. What the
 * reporter actually saw was one fixed element painting over another, and the only
 * layer that can prove that is a real browser measuring real boxes. So each test
 * reads bounding boxes at phone width and asserts what must not overlap.
 *
 * `elementFromPoint` is *not* usable as the probe: it skips
 * `pointer-events: none` elements, and the offending sheet carried exactly that
 * — which is why the hidden `Menu` button stayed clickable while being invisible.
 */

const PHONE = { width: 568, height: 993 }; // the viewport from the issue report

/** A box in viewport coordinates; every assertion below is expressed over these. */
type Box = { x: number; y: number; width: number; height: number };

/** Vertical overlap between two boxes, in px (0 when they merely touch). */
function verticalOverlap(a: Box, b: Box): number {
  return Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

/** Do two boxes intersect at all? */
function intersects(a: Box, b: Box): boolean {
  return (
    verticalOverlap(a, b) > 0 &&
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) > 0
  );
}

async function box(page: Page, selector: string): Promise<Box> {
  const found = await page.locator(selector).first().boundingBox();
  if (!found) throw new Error(`no bounding box for ${selector}`);
  return found;
}

test.describe('mobile chrome at phone width', () => {
  test.beforeEach(async ({ page }) => {
    // The dashboard's widgets proxy external data; abort so the page is
    // deterministic (mirrors dashboard.e2e.ts).
    await page.route(/\/(news|weather|market)\b/, (route) => route.abort());
    await page.addInitScript(() => {
      window.localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
    });
    await page.setViewportSize(PHONE);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('the collapsed More sheet leaves the bottom tab bar fully visible', async ({ page }) => {
    await page.goto('/dashboard');

    const navBar = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(navBar).toBeVisible();
    const sheet = page.getByRole('dialog', { name: 'Menu' });

    const barBox = await box(page, 'nav[aria-label="Mobile navigation"]');
    const sheetBox = await box(page, '#mobile-nav-more');

    // The bug: closed, the sheet was anchored `bottom: 4rem` and hidden with
    // `translate-y-full`, which shifts it by its OWN height only — never by that
    // 4rem — so its opaque top edge landed exactly on the bar and covered it.
    expect(
      verticalOverlap(sheetBox, barBox),
      'the collapsed sheet must not overlap the tab bar at all',
    ).toBe(0);
    // Stronger: closed, it is entirely below the fold.
    expect(sheetBox.y, 'the collapsed sheet must sit below the viewport').toBeGreaterThanOrEqual(
      PHONE.height,
    );

    // …and the bar itself really is on screen, with every tab reachable.
    expect(barBox.y + barBox.height).toBeLessThanOrEqual(PHONE.height + 1);
    for (const label of ['Dashboard', 'Tasks', 'Menu']) {
      await expect(navBar.getByText(label, { exact: true })).toBeVisible();
    }

    // Open, every control in the sheet must still land above the bar. The sheet's
    // own box deliberately runs to `bottom: 0` and reserves the bar's height as
    // padding, so measure the lowest control rather than the padding box.
    const moreTab = navBar.getByRole('button', { name: 'Menu' });
    await moreTab.click();
    await expect(sheet).toBeVisible();
    const lockBox = await sheet.getByRole('button', { name: 'Lock' }).boundingBox();
    if (!lockBox) throw new Error('no bounding box for the sheet Lock button');
    expect(
      intersects(lockBox, barBox),
      "the open sheet's lowest control must sit above the tab bar",
    ).toBe(false);

    // …and the bar is genuinely on top of the open sheet, not merely painted
    // over it: Playwright's click does hit-target testing, so if the sheet
    // intercepted pointer events over the bar this would fail rather than close.
    await moreTab.click();
    await expect(sheet).toBeHidden();
  });

  test('the assistant FAB steps aside while the More sheet is open', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('button', { name: 'Open assistant' })).toBeVisible();
    const fabBox = await box(page, 'button[data-tour="assistant"]');
    const centre = { x: fabBox.x + fabBox.width / 2, y: fabBox.y + fabBox.height / 2 };
    /** What a tap at the FAB's centre would actually land on. */
    const hit = () =>
      page.evaluate(
        (p) => document.elementFromPoint(p.x, p.y)?.closest('[data-tour="assistant"]') !== null,
        centre,
      );

    /** The glow wrapper that carries the fade — the FAB's own fixed layer. */
    const wrapper = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-tour="assistant"]')?.parentElement as HTMLElement;
        const style = getComputedStyle(el);
        return { opacity: style.opacity, zIndex: style.zIndex };
      });

    expect(await hit(), 'the FAB owns its own pixels at rest').toBe(true);

    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Menu' }).click();
    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await expect(sheet).toBeVisible();

    // The FAB is fixed bottom-right, right over the sheet's theme/lock row — it
    // has to disappear while the sheet is up. Faded out (and out of the a11y
    // tree), NOT restacked: the bar stays the topmost fixed layer (#5).
    await expect.poll(async () => (await wrapper()).opacity).toBe('0');
    expect((await wrapper()).zIndex, 'the FAB keeps its own layer').toBe('40');
    // It's gone from the accessibility tree too, so the sheet is the only surface
    // a screen reader or the keyboard can reach.
    await expect(page.getByRole('button', { name: 'Open assistant' })).toHaveCount(0);
    // `elementFromPoint` skips `pointer-events: none`, so this proves a tap over
    // the faded FAB reaches the sheet instead of the assistant.
    expect(await hit(), 'a tap over the hidden FAB must reach the sheet').toBe(false);

    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Menu' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open assistant' })).toBeVisible();
    expect((await wrapper()).opacity, 'closing the sheet gives the FAB back').toBe('1');
    expect(await hit()).toBe(true);
  });

  test('the More sheet puts the locale picker directly above the Lock button', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Menu' }).click();
    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await expect(sheet).toBeVisible();

    // Notifications live in the header-actions bell, not in this sheet.
    await expect(sheet.getByRole('button', { name: /notification/i })).toHaveCount(0);

    const language = await sheet.getByRole('button', { name: /^Language:/ }).boundingBox();
    const lock = await sheet.getByRole('button', { name: 'Lock' }).boundingBox();
    if (!language || !lock) throw new Error('no bounding box for the language / lock control');

    // Right-hand column, one row up: same right edge (within a hair), no vertical
    // overlap, and language above.
    expect(Math.abs(language.x + language.width - (lock.x + lock.width))).toBeLessThanOrEqual(2);
    expect(verticalOverlap(language, lock)).toBe(0);
    expect(language.y).toBeLessThan(lock.y);
  });

  test('the dashboard prompt composer clears the bottom tab bar', async ({ page }) => {
    await page.goto('/dashboard');

    const composer = page.locator('[data-tour="dashboard-composer"]');
    await expect(composer.getByPlaceholder(/Add tasks, one per line/)).toBeVisible();
    // The submit control is the composer's lowest element — measure that, not the
    // textarea (which cleared the bar even while the button below it did not).
    const submit = composer.getByRole('button', { name: /^add/i });
    await expect(submit).toBeVisible();

    const barBox = await box(page, 'nav[aria-label="Mobile navigation"]');
    const submitBox = await submit.boundingBox();
    if (!submitBox) throw new Error('no bounding box for the composer submit button');

    // The composer's fixed wrapper was `bottom-0 z-30` — below the bar's z-40 —
    // so its lower rows, the `Add` button included, rendered behind the tab bar.
    expect(
      intersects(submitBox, barBox),
      'the composer submit button must not sit underneath the tab bar',
    ).toBe(false);
  });

  test('the desktop title bar slots do not collide at phone width', async ({ page }) => {
    // The frameless title bar only mounts when the desktop preload exposes a
    // window-chrome bridge, so stand one up: this is the desktop-app layout the
    // issue was filed against, reproduced in the harness.
    await page.addInitScript(() => {
      const noop = () => () => undefined;
      window.midniteDesktop = {
        notify: () => undefined,
        onNavigate: noop,
        windowChrome: {
          platform: 'darwin',
          frameless: true,
          onFullscreenChange: noop,
          onFocusChange: noop,
          setBackgroundColor: () => undefined,
        },
      };
    });
    await page.goto('/dashboard');

    const bar = page.getByRole('banner', { name: 'Window title bar' });
    await expect(bar).toBeVisible();

    const title = bar.getByText('Dashboard', { exact: true });
    const search = bar.getByRole('button', { name: /search/i });
    await expect(title).toBeVisible();
    await expect(search).toBeVisible();

    const titleBox = await title.boundingBox();
    const searchBox = await search.boundingBox();
    if (!titleBox || !searchBox) throw new Error('no bounding box for a title-bar slot');

    // The bug: `center` was absolutely centred at `min-w-[14rem]` while the
    // left/right slots were `shrink-0`, so below ~900px the page title and the
    // search pill occupied the same pixels ("Dashb<Search Midnite…").
    expect(
      intersects(titleBox, searchBox),
      'the page title and the search pill must not overlap',
    ).toBe(false);
  });
});
