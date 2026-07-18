import { test } from '@playwright/test';

/**
 * Screenshot capture for the update banner (not an assertion spec). Run with
 * `UPDATE_SHOTS=1` to write PNGs for the PR. Stubs version.json to force the
 * banner, then shoots light + dark at desktop and mobile widths.
 */
const OUT = process.env['UPDATE_SHOTS_DIR'] || '/tmp/p71-shots';

test.describe('Update banner shots', () => {
  test.skip(!process.env['UPDATE_SHOTS'], 'set UPDATE_SHOTS=1 to capture');

  test.beforeEach(async ({ page }) => {
    await page.route(/\/(news|weather|market)\b/, (route) => route.abort());
    await page.route('**/version.json**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ version: '99.0.0', channel: 'stable', notesUrl: 'https://example.com' }),
      }),
    );
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`desktop ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/dashboard');
      await page.getByText(/a new version is available/i).waitFor();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/desktop-${theme}.png` });
    });
  }

  test('mobile light', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/dashboard');
    await page.getByText(/a new version is available/i).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/mobile-light.png` });
  });

  // Desktop (electron-updater) states via a fake preload bridge (Theme E).
  for (const theme of ['light', 'dark'] as const) {
    test(`desktop updater states ${theme}`, async ({ page }) => {
      await page.addInitScript(() => {
        let handler: ((s: unknown) => void) | null = null;
        let last: unknown = null;
        (window as unknown as { __pushUpdate: (s: unknown) => void }).__pushUpdate = (s) => {
          last = s;
          handler?.(s);
        };
        (window as unknown as { midnite: unknown }).midnite = {
          updates: {
            onState: (h: (s: unknown) => void) => {
              handler = h;
              if (last) h(last);
              return () => {
                handler = null;
              };
            },
            check: () => {},
            download: () => {},
            restartToInstall: () => {},
          },
        };
      });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/dashboard');

      const push = (state: unknown) =>
        page.evaluate(
          (s) => (window as unknown as { __pushUpdate: (v: unknown) => void }).__pushUpdate(s),
          state,
        );

      await push({ phase: 'downloading', version: '99.0.0', percent: 60, error: null });
      await page.getByRole('progressbar').waitFor();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/desktop-downloading-${theme}.png` });

      await push({ phase: 'downloaded', version: '99.0.0', percent: 100, error: null });
      await page.getByText(/ready to install/i).waitFor();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/desktop-downloaded-${theme}.png` });
    });
  }
});
