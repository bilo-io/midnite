import { join, resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedProject } from './helpers/gateway';

/**
 * Phase 42 Theme C — capture the new "Phase docs" tab in the project modal: the
 * doc list and the markdown editor. The GitHub Contents API (proxied by the
 * gateway via `gh`) can't run against a real repo in e2e, so the `/repos` and
 * `/phase-docs` calls are route-mocked here; the deterministic UI states are what
 * we screenshot. (The data path is covered by gateway + RTL unit tests.)
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

const REPO = { id: 'repo-1', name: 'midnite', path: '~/Dev/midnite', ownerRepo: 'acme/midnite', createdAt: '', updatedAt: '' };
const DOCS = [
  { name: 'auth-revamp.md', path: '.midnite/phases/auth-revamp.md', sha: 'sha-a', content: '' },
  { name: 'billing.md', path: '.midnite/phases/billing.md', sha: 'sha-b', content: '' },
];
const DOC_BODY = '# Auth revamp\n\n- [ ] Replace session cookies with JWTs\n- [ ] Add refresh-token rotation\n- [x] Audit the login form\n';

test.use({ colorScheme: 'dark', viewport: { width: 1440, height: 980 } });

test('phase docs tab — list and editor', async ({ page }) => {
  await seedProject('Phase docs demo', 'A project with a linked GitHub repo');

  // Fresh e2e gateway has no provider, so the Setup wizard dialog would float over
  // the modal and intercept clicks; dismiss it and push the idle screensaver out.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.theme', 'dark');
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86_400 }));
    } catch {
      // storage may be unavailable — colorScheme is the fallback
    }
  });

  await page.route('**/repos', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([REPO]) }),
  );
  await page.route('**/phase-docs?**', (route) => {
    if (route.request().url().includes('phase-docs/')) {
      const doc = { ...DOCS[0], content: DOC_BODY };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ doc }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ docs: DOCS }) });
  });
  await page.route('**/phase-docs/**', (route) => {
    const doc = { ...DOCS[0], content: DOC_BODY };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ doc }) });
  });

  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/projects');

  // Open the project modal, then the Phase docs tab.
  await page.getByText('Phase docs demo', { exact: false }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await dialog.getByRole('tab', { name: /Phase docs/i }).click();

  // Pick the repo → the doc list renders.
  await dialog.getByLabel('Repo').selectOption('repo-1');
  await dialog.getByText('auth-revamp.md').waitFor();
  await dialog.screenshot({ path: join(OUT, 'phase-docs-list.png') });

  // Open a doc → the markdown editor.
  await dialog.getByText('auth-revamp.md').click();
  await dialog.getByLabel('Phase doc content').waitFor();
  await dialog.screenshot({ path: join(OUT, 'phase-docs-editor.png') });
});
