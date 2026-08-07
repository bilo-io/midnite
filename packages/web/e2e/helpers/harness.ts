import { test as base, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

/**
 * The shared e2e harness: a `test` that boots every spec past the app's two
 * first-run modal gates.
 *
 * Both gates are *correct* product behaviour that happens to be permanently on
 * in this harness, and both render a full-viewport overlay that swallows every
 * click, drag and keypress:
 *
 *  - **The setup wizard** (`components/SetupWizard.tsx`) auto-opens whenever the
 *    gateway reports `ready === false`. `playwright.config.ts` deliberately
 *    blanks `ANTHROPIC_API_KEY` & friends so task titles stay deterministic, so
 *    the e2e gateway is *never* ready and the wizard *always* opens.
 *  - **The idle screensaver** (`inactivityTimeoutS`, default 30s — see
 *    `packages/shared/src/preferences.ts`). Any spec that stalls for half a
 *    minute — e.g. one already blocked by the wizard — picks up a second
 *    interceptor on top of the first.
 *
 * This used to be a `beforeEach` + `addInitScript` block copy-pasted into each
 * spec, which meant a new spec was silently born broken and a handful of older
 * ones (board, task-graph, task-detail, search-*) never had it at all. Importing
 * `test` from here is now the only thing a spec has to do.
 *
 * Storage keys are literals on purpose: they mirror `SetupWizard.tsx`,
 * `setup-nudge.tsx` and `@midnite/shell`'s `SETTINGS_STORAGE_KEY`, and the
 * harness should fail loudly against a real running app rather than silently
 * track a renamed constant through a build artifact.
 */

/** A day, so the idle timer can never fire inside a run. */
const IDLE_TIMEOUT_S = 86_400;

/**
 * Merge `partial` into `midnite.settings` on every navigation.
 *
 * Merging, not overwriting, is the whole point: `addInitScript` callbacks stack
 * and re-run on *every* page load, so a spec that assigned the key wholesale
 * would clobber the harness's `inactivityTimeoutS` and hand itself a screensaver
 * mid-test. Use this instead of `localStorage.setItem('midnite.settings', …)`.
 */
export async function mergeSettings(
  target: Page | BrowserContext,
  partial: Record<string, unknown>,
): Promise<void> {
  await target.addInitScript((next) => {
    try {
      const prev = JSON.parse(localStorage.getItem('midnite.settings') ?? '{}') as Record<
        string,
        unknown
      >;
      localStorage.setItem('midnite.settings', JSON.stringify({ ...prev, ...next }));
    } catch {
      // best effort — a spec asserting on settings will fail loudly anyway
    }
  }, partial);
}

/**
 * Press a global keyboard shortcut, retrying until it takes effect.
 *
 * The listeners behind ⌘K / `?` / the `G _` nav chords are attached in effects
 * (`command-palette.tsx`, `hooks/use-global-keymap.ts`) that live *inside*
 * `<AuthGate>` — which renders `null` for all children until the session
 * resolves. A single un-retried `keyboard.press()` fired straight after `goto()`
 * therefore lands on nothing and is lost forever, which is exactly what made the
 * palette specs flaky. `expect.toPass` re-presses until the expectation holds.
 */
export async function pressGlobalKey(
  page: Page,
  key: string,
  settled: () => Promise<unknown>,
  timeout = 20_000,
): Promise<void> {
  await expect(async () => {
    await page.keyboard.press(key);
    await settled();
  }).toPass({ timeout });
}

/**
 * Open the command palette with ⌘K and return its dialog locator.
 *
 * The single most repeated line in the suite, and the single most common flake
 * before `pressGlobalKey` — see its note on the `<AuthGate>` hydration race.
 */
export async function openPalette(page: Page) {
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await pressGlobalKey(page, 'ControlOrMeta+k', () =>
    expect(palette).toBeVisible({ timeout: 2_000 }),
  );
  return palette;
}

/**
 * Suppress both gates on a page or a whole browser context.
 *
 * The `test` below applies this to the default `page` automatically, so specs
 * never call it directly — *except* the ones that build their own context via
 * `browser.newContext()` (office-presence drives two guests at once). A fixture
 * override can't reach those, so they call this on each context by hand.
 */
export async function suppressFirstRunGates(target: Page | BrowserContext): Promise<void> {
  await target.addInitScript(
    ({ idleTimeoutS }) => {
      try {
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        const prev = JSON.parse(localStorage.getItem('midnite.settings') ?? '{}') as Record<
          string,
          unknown
        >;
        localStorage.setItem(
          'midnite.settings',
          JSON.stringify({ ...prev, inactivityTimeoutS: idleTimeoutS }),
        );
      } catch {
        // best effort — a blocked spec fails on the overlay soon enough
      }
    },
    { idleTimeoutS: IDLE_TIMEOUT_S },
  );
}

export const test = base.extend({
  // Playwright passes the fixture callback positionally, so it does not have to
  // be named `use` — and here it must not be: `react-hooks/rules-of-hooks` reads
  // a bare `use(...)` call as React's `use` hook and fails the lint.
  page: async ({ page }, provide) => {
    await suppressFirstRunGates(page);
    await provide(page);
  },
});

export { expect };
