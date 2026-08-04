import { resolve } from 'node:path';

import { test, type Page } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { moveTaskStatus, seedProject, seedTask } from './helpers/gateway';

/**
 * Phase 82 Theme D (projects + pr-review slice) — the Projects list, its Templates
 * tab and the project cockpit rendered under fr-FR, proving the new `projects`
 * namespace reads end-to-end: the tab pills, the view-toggle aria labels, the ICU
 * task-count plural on each card, the progress summary's locale percent form, the
 * template seam resolving the shared registry's names, and the cockpit's tabs +
 * both rail titles. The locale rides the Phase 43 settings blob the pre-paint init
 * script resolves. Preview PNGs only (no baselines) — the full-surface fr-FR
 * walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

/** Dark theme + fr-FR + the wizard/nudge silenced, before first paint. */
function seedLocale(page: Page) {
  return page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.theme', 'dark');
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem(
        'midnite.settings',
        JSON.stringify({ locale: 'fr-FR', inactivityTimeoutS: 86_400 }),
      );
    } catch {
      // storage unavailable — the default locale is the fallback
    }
  });
}

/**
 * A project with a mixed task set, so the card shows a real ICU plural + a
 * part-complete progress bar rather than the (already-French) empty state.
 */
async function seedProjectWithTasks(label: string) {
  const project = await seedProject(label, 'Refonte du parcours de facturation.');
  const done = await seedTask(`${label} — tâche livrée`, 'todo', { projectId: project.id });
  await moveTaskStatus(done.id, 'done');
  await seedTask(`${label} — tâche en attente`, 'todo', { projectId: project.id });
  await seedTask(`${label} — autre tâche`, 'todo', { projectId: project.id });
  return project;
}

test('projects list + templates tab — fr-FR', async ({ page }) => {
  await seedProjectWithTasks(`Facturation ${Date.now()}`);
  await seedLocale(page);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/projects');
  // The French task-count plural doubles as the cards-hydrated signal.
  await page.getByText('3 tâches', { exact: true }).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/projects-fr.png`, fullPage: true });

  // Templates tab: names + descriptions resolved through the shared-registry seam.
  await page.getByRole('button', { name: 'Modèles', exact: true }).click();
  await page.getByText('Document d’exigences produit').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/projects-fr-templates.png`, fullPage: true });
});

test('project cockpit — fr-FR', async ({ page }) => {
  const project = await seedProjectWithTasks(`Cockpit ${Date.now()}`);
  await seedLocale(page);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto(`/projects/view?id=${project.id}`);
  // The left rail's French title proves the cockpit copy resolved.
  await page.getByText('Statistiques et actions', { exact: true }).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/projects-fr-detail.png`, fullPage: true });

  // The Docs tab carries the plan panel + council-runs copy.
  await page.getByRole('tab', { name: 'Documents' }).click();
  await page.getByText('Ajouter un document').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/projects-fr-detail-docs.png`, fullPage: true });
});
