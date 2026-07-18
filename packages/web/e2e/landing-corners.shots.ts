import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { GATEWAY_ORIGIN, SCREENSHOTS_DIR } from './config';

// Landing-page corners: the clock moved to the top-centre (top-right is now the
// header-actions cluster) with a hover cycle between digital/analogue, and the
// weather readout in the top-left. Self-contained: a saved dashboard weather
// location + a stubbed /weather response, so it never depends on Open-Meteo.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

const WEATHER = {
  current: { temperatureC: 18, weatherCode: 2, precipitation: 0 },
  today: { highC: 22, lowC: 15, precipitationProbability: 10, weatherCode: 2 },
  resolvedAt: '2026-07-18T09:00:00.000Z',
};

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      // A saved dashboard weather location → the corner weather resolves with no
      // geolocation prompt.
      localStorage.setItem(
        'midnite.dashboard.widgets',
        JSON.stringify([
          { type: 'weather', config: { units: 'c', location: { lat: 51.5, lon: -0.12, label: 'London' } } },
        ]),
      );
    } catch {
      /* best effort */
    }
  });
  await page.route(`${GATEWAY_ORIGIN}/weather**`, (route) =>
    route.fulfill({ json: WEATHER }),
  );
});

for (const scheme of ['light', 'dark'] as const) {
  test(`landing corners — clock top-centre + weather top-left (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');

    // Weather (top-left) resolves from the saved location.
    await expect(page.getByText('18°C')).toBeVisible();
    await page.screenshot({ path: join(OUT, `landing-corners-${scheme}.png`) });

    // Hover the clock to reveal the digital/analogue cycle button.
    await page.getByText(/\d{2}:\d{2}:\d{2}/).hover();
    await expect(page.getByRole('button', { name: /switch to analogue clock/i })).toBeVisible();
    await page.screenshot({ path: join(OUT, `landing-corners-hover-${scheme}.png`) });

    // Cycle to the analogue face.
    await page.getByRole('button', { name: /switch to analogue clock/i }).click();
    await expect(page.getByRole('img', { name: /analogue clock/i })).toBeVisible();
    await page.screenshot({ path: join(OUT, `landing-corners-analogue-${scheme}.png`) });
  });
}
