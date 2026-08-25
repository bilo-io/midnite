import { expect, test } from './helpers/harness';

/**
 * Idle-CPU regression guard — bilo-io/midnite-app#4.
 *
 * The app used to animate `--accent-angle` (an *inheriting* registered custom
 * property) on `<html>`, which pushed a new value onto every element each frame
 * and so invalidated paint for the whole document, forever, on every page. At
 * rest on /workflows that measured ~59% of one core; after confining the spin to
 * the elements that actually paint the gradient it is ~10% on the same harness.
 *
 * Two things are pinned here, because each misses what the other catches:
 *  1. the CPU budget — the regression itself;
 *  2. that every accent painter still animates — the fix's own failure mode. A
 *     *registered* property resolves to its `initial-value` instead of falling
 *     through `var()`, so a painter left off the selector lists silently renders
 *     frozen at 0deg. That is invisible to a CPU measurement.
 */

/**
 * Generous on purpose. The real regression is a ~6× jump (10% → 59%), so a loose
 * ceiling still catches it while leaving room for a slow or software-rendering
 * CI runner. Tighten only with measurements from the machine that runs it.
 */
const IDLE_CPU_CEILING_PCT = 35;
const SETTLE_MS = 4_000;
const SAMPLE_MS = 8_000;

/** Every selector that paints `var(--accent-gradient)`, and so must carry the spin. */
const PAINTERS = [
  '.bg-primary',
  '[data-accent-surface]',
  '.accent-gradient-surface',
  '.text-accent-gradient',
  '.accent-gradient-border',
  '.accent-gradient-border--spin',
] as const;

test.describe('at-rest CPU', () => {
  test('an idle page does not spin the CPU', async ({ page }) => {
    test.setTimeout(120_000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    await page.goto('/workflows');
    await page.waitForTimeout(SETTLE_MS);

    const read = async () => {
      const m = await cdp.send('Performance.getMetrics');
      const g = (n: string) => m.metrics.find((x) => x.name === n)?.value ?? 0;
      return { task: g('TaskDuration'), ts: g('Timestamp') };
    };

    // Deliberately no requestAnimationFrame here: a page-side rAF loop would
    // itself drive rendering at full rate and measure the instrument instead of
    // the app — which is exactly how this bug stayed hidden.
    const before = await read();
    await page.waitForTimeout(SAMPLE_MS);
    const after = await read();

    const busyPct = ((after.task - before.task) / (after.ts - before.ts)) * 100;
    // eslint-disable-next-line no-console -- the measured value is the point of the test
    console.log(`idle main-thread busy: ${busyPct.toFixed(1)}%`);
    expect(busyPct).toBeLessThan(IDLE_CPU_CEILING_PCT);
  });

  test('every accent painter still animates its own angle', async ({ page }) => {
    await page.goto('/workflows');
    await page.waitForTimeout(1_500);

    const animating = await page.evaluate(
      async ([selectors, settleMs]) => {
        const html = document.documentElement;
        if (!html.hasAttribute('data-accent-animate')) return { skipped: true, results: [] };

        const read = (el: Element) => getComputedStyle(el).getPropertyValue('--accent-angle').trim();
        const found = (selectors as readonly string[])
          .map((sel) => ({ sel, el: document.querySelector(sel) }))
          .filter((x): x is { sel: string; el: Element } => x.el !== null);

        const first = found.map(({ sel, el }) => ({ sel, a: read(el) }));
        await new Promise((r) => setTimeout(r, settleMs as number));
        const second = found.map(({ sel, el }) => ({ sel, b: read(el) }));

        return {
          skipped: false,
          results: first.map((f, i) => ({ sel: f.sel, a: f.a, b: second[i]!.b })),
        };
      },
      [PAINTERS, 900] as const,
    );

    test.skip(animating.skipped, 'accent animation is off for this profile');
    // At least one painter must be on the page, or the assertion is vacuous.
    expect(animating.results.length).toBeGreaterThan(0);
    for (const r of animating.results) {
      // A painter missing from the selector lists sits at the registered
      // initial-value and never moves.
      expect(r.a, `${r.sel} is frozen at the initial angle`).not.toBe('0deg');
      expect(r.b, `${r.sel} is not animating`).not.toBe(r.a);
    }
  });
});
