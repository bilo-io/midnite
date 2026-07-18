import { expect, test } from '@playwright/test';

/**
 * App-update banner flow (Phase 71 Themes B/C). The running build's version is
 * baked in at build time; we stub the polled `/version.json` to control whether
 * an update appears. The SW is production-only (skipped under `next dev`), so
 * this exercises the version.json detection path — the banner still appears,
 * pushes the app down, dismisses, and re-surfaces on navigation.
 */
test.describe('Update banner', () => {
  // Keep the dashboard's external widgets from flaking the page.
  test.beforeEach(async ({ page }) => {
    await page.route(/\/(news|weather|market)\b/, (route) => route.abort());
  });

  test('appears for a newer version, dismisses, and re-surfaces on navigation', async ({ page }) => {
    await page.route('**/version.json**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ version: '99.0.0', channel: 'stable' }),
      }),
    );

    await page.goto('/dashboard');

    const banner = page.getByText(/a new version is available/i);
    await expect(banner).toBeVisible();

    // Dismiss hides it for this view (animates to 0 height → not visible).
    await page.getByRole('button', { name: /dismiss update notice/i }).click();
    await expect(banner).toBeHidden();

    // Reload / navigation re-surfaces it — dismissal is never persisted.
    await page.goto('/board');
    await expect(page.getByText(/a new version is available/i)).toBeVisible();
  });

  test('stays hidden when the build is up to date', async ({ page }) => {
    await page.route('**/version.json**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        // 0.0.0 is never newer than the built version → no update.
        body: JSON.stringify({ version: '0.0.0', channel: 'stable' }),
      }),
    );

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByText(/a new version is available/i)).toBeHidden();
  });

  /**
   * Desktop (electron-updater) path (Theme E). A fake `window.midnite.updates`
   * bridge stands in for the Electron preload: the provider detects it, so the
   * version.json poll is ignored and the banner is driven entirely by pushed
   * updater state. Drives available → download click → progress → downloaded →
   * restart click, asserting the desktop-specific copy + that the bridge methods
   * fire.
   */
  test('drives the electron-updater flow: download → progress → restart', async ({ page }) => {
    await page.addInitScript(() => {
      // Minimal fake of the preload bridge; the test pushes state via __pushUpdate.
      // The last state is remembered and replayed on subscribe, so a push that
      // races the provider's mount effect is still delivered (no test-timing flake).
      const calls: string[] = [];
      let handler: ((s: unknown) => void) | null = null;
      let last: unknown = null;
      (window as unknown as { __updateCalls: string[] }).__updateCalls = calls;
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
          check: () => calls.push('check'),
          download: () => calls.push('download'),
          restartToInstall: () => calls.push('restartToInstall'),
        },
      };
    });

    await page.goto('/dashboard');

    // Idle → no banner.
    await expect(page.getByText(/a new version is available/i)).toBeHidden();

    // Feed reports an available update → banner shows with the update action.
    await page.evaluate(() =>
      (window as unknown as { __pushUpdate: (s: unknown) => void }).__pushUpdate({
        phase: 'available',
        version: '99.0.0',
        percent: null,
        error: null,
      }),
    );
    await expect(page.getByText(/a new version is available/i)).toBeVisible();
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    expect(await page.evaluate(() => (window as unknown as { __updateCalls: string[] }).__updateCalls)).toContain(
      'download',
    );

    // Progress → disabled action + progressbar.
    await page.evaluate(() =>
      (window as unknown as { __pushUpdate: (s: unknown) => void }).__pushUpdate({
        phase: 'downloading',
        version: '99.0.0',
        percent: 60,
        error: null,
      }),
    );
    await expect(page.getByRole('progressbar', { name: /downloading update/i })).toHaveAttribute(
      'aria-valuenow',
      '60',
    );

    // Downloaded → "Restart to install" installs on click.
    await page.evaluate(() =>
      (window as unknown as { __pushUpdate: (s: unknown) => void }).__pushUpdate({
        phase: 'downloaded',
        version: '99.0.0',
        percent: 100,
        error: null,
      }),
    );
    await expect(page.getByText(/ready to install/i)).toBeVisible();
    await page.getByRole('button', { name: 'Restart to install' }).click();
    expect(await page.evaluate(() => (window as unknown as { __updateCalls: string[] }).__updateCalls)).toContain(
      'restartToInstall',
    );
  });
});
