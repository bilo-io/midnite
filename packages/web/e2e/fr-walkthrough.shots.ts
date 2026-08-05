import { resolve } from 'node:path';

import { test, type Page } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedTask } from './helpers/gateway';

/**
 * Phase 82 Theme F — the full fr-FR walkthrough, as a spec rather than a one-off session.
 *
 * The phase's closing item asks for a click-through of every major surface in French
 * "for the record". A folder of PNGs would be the record; a folder of PNGs plus the
 * script that produced them is a record you can *re-run* — against a fifth locale, or
 * after a redesign, without reconstructing what was looked at. Every earlier slice
 * shipped a narrow `*-i18n-fr.shots.ts`; this is the union, in nav order.
 *
 * Deliberately **not** visual-regression baselines: these pages carry live gateway data,
 * animation and a starfield, so pinned pixels would flake for reasons that have nothing
 * to do with translation. The value is a human-reviewable sweep for raw keys, clipped
 * text and stray English — the three things unit tests structurally cannot see.
 *
 * Each surface waits on a *French* string before shooting, so a page that silently fell
 * back to en-GB fails the spec instead of quietly producing an English screenshot.
 *
 * The French signal must be matched **among visible nodes only**. The collapsed sidenav
 * rail keeps a hidden `<span>` per feature label, so an unfiltered `getByText(...).first()`
 * latches onto that hidden node and waits for it to become visible until the test times
 * out — a 60s failure that looks like a slow page and is really a bad locator.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

function seedFrench(): void {
  try {
    localStorage.setItem('midnite.theme', 'dark');
    localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
    sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    localStorage.setItem(
      'midnite.settings',
      // A long inactivity timeout keeps the Phase 39 lock screen from stealing a shot.
      JSON.stringify({ locale: 'fr-FR', inactivityTimeoutS: 86_400 }),
    );
  } catch {
    // storage unavailable — the default locale is the fallback
  }
}

/**
 * The walkthrough, in sidenav order. `expect` is a string that must exist in French on
 * that surface — it doubles as the hydration signal and as the assertion that the page
 * really is in French.
 */
const SURFACES: { name: string; path: string; expect: string; settle?: number }[] = [
  { name: 'dashboard', path: '/dashboard', expect: 'Tableau de bord', settle: 1500 },
  // The page *description*, not a board column. Waiting on a column ("À faire") let an
  // English page header through: the columns come from `board.columns.*` (Theme B) while
  // the title/description/toolbar come from `board.page.*` and `setup.guardrails.*`, so a
  // column being French says nothing about the chrome above it.
  { name: 'board', path: '/tasks', expect: 'Tâches regroupées par statut' },
  { name: 'sessions', path: '/sessions', expect: 'Sessions' },
  { name: 'projects', path: '/projects', expect: 'Projets' },
  { name: 'workflows', path: '/workflows', expect: 'Flux de travail' },
  { name: 'councils', path: '/councils', expect: 'Conseils' },
  { name: 'memory', path: '/memory', expect: 'Mémoire' },
  { name: 'media', path: '/media', expect: 'Médias' },
  // The feed is empty in the harness, so its empty-state copy is the French signal.
  { name: 'digests', path: '/digests', expect: 'Aucun digest' },
  { name: 'ops', path: '/ops', expect: 'Exploitation', settle: 2500 },
  // Appearance is a *section* of the settings index (`appearance-section.tsx`), not its
  // own route. Signal on a **newly-seamed option label**, not the "Langue" heading:
  // that heading was already French before this slice, so it would have passed happily
  // over the ten English registry strings the walkthrough actually found here.
  { name: 'settings-appearance', path: '/settings', expect: 'Révélation de page' },
  { name: 'settings-agents', path: '/settings/agents', expect: 'Agents' },
];

async function shoot(page: Page, s: (typeof SURFACES)[number]): Promise<void> {
  await page.goto(s.path);
  await page
    .getByText(s.expect, { exact: false })
    .filter({ visible: true })
    .first()
    .waitFor({ state: 'visible' });
  await page.waitForTimeout(s.settle ?? 900);
  await page.screenshot({ path: `${OUT}/fr-${s.name}.png`, fullPage: true });
}

test.describe('fr-FR walkthrough', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(seedFrench);
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  for (const surface of SURFACES) {
    test(surface.name, async ({ page }) => {
      await shoot(page, surface);
    });
  }

  /**
   * The board again, but **seeded**. An empty board renders none of the toolbar chrome, so
   * the plain `board` shot above can't show the item-count pill, the progress bar or the
   * guardrail buttons — precisely the strings a stale build was reported as showing in
   * English. Seeding a task makes them render, and the assertions below pin each one.
   */
  test('board with tasks — toolbar chrome', async ({ page }) => {
    await seedTask('Créer le monde 3D', 'todo');
    await page.goto('/tasks');
    await page
      .getByText('Tâches regroupées par statut', { exact: false })
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'visible' });
    // Each of these was reported as English on a build predating PRs #596/#602:
    // the count pill (`common.chrome.itemCount`), the progress label
    // (`projects.progress.label`) and the two guardrail buttons (`setup.guardrails.*`).
    await page
      .getByText('1 élément', { exact: false })
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /Suspendre la planification/ }).waitFor();
    await page.getByRole('button', { name: /Arrêt d.urgence/ }).waitFor();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/fr-board-seeded.png`, fullPage: true });
  });

  test('login (unauthenticated chrome)', async ({ page }) => {
    // The auth surfaces render outside the app shell, so they miss every in-app check.
    await page.goto('/login');
    await page
      .getByText('Se connecter', { exact: false })
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'visible' });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/fr-login.png`, fullPage: true });
  });
});
