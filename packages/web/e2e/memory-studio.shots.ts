import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedMemory } from './helpers/gateway';

// Phase 65 D — preview shots of the Studio rail generating artifacts. Generation
// needs an LLM, which the e2e gateway has no key for, so we mock the artifacts
// endpoints to show the *ready* end-state (a brief + a rendered infographic + a
// failed row). Preview artifacts, not baseline assertions.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

const BRIEF_MD = `# Executive brief

**Overview.** midnite is a multitask orchestrator for Claude Code — a long-running
gateway spawns agent sessions and exposes a REST + WS API.

- Kanban board with live agent presence
- Workflows, retros, and fleet digests
- A knowledge Studio per memory

*So what:* one surface to plan, run, and review parallel agent work.`;

const INFOGRAPHIC_SVG = `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#f8fafc"/>
  <text x="400" y="60" font-family="sans-serif" font-size="34" font-weight="700" fill="#1e293b" text-anchor="middle">midnite at a glance</text>
  <g font-family="sans-serif">
    <rect x="60" y="120" width="200" height="140" rx="14" fill="#ede9fe"/>
    <text x="160" y="180" font-size="40" font-weight="700" fill="#6d28d9" text-anchor="middle">65</text>
    <text x="160" y="215" font-size="16" fill="#4c1d95" text-anchor="middle">phases shipped</text>
    <rect x="300" y="120" width="200" height="140" rx="14" fill="#dbeafe"/>
    <text x="400" y="180" font-size="40" font-weight="700" fill="#1d4ed8" text-anchor="middle">3</text>
    <text x="400" y="215" font-size="16" fill="#1e3a8a" text-anchor="middle">panel workspace</text>
    <rect x="540" y="120" width="200" height="140" rx="14" fill="#dcfce7"/>
    <text x="640" y="180" font-size="40" font-weight="700" fill="#15803d" text-anchor="middle">7</text>
    <text x="640" y="215" font-size="16" fill="#14532d" text-anchor="middle">artifact kinds</text>
  </g>
  <text x="400" y="340" font-family="sans-serif" font-size="18" fill="#334155" text-anchor="middle">Sources → grounded chat → generated artifacts</text>
</svg>`;

function artifact(kind: string, format: string, title: string, content: string, status = 'ready') {
  return {
    id: `art-${kind}`,
    memoryId: 'preview',
    kind,
    format,
    title,
    content,
    status,
    error: status === 'failed' ? 'No AI provider is configured. Add one in Settings to generate artifacts.' : null,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  };
}

const READY_ARTIFACTS = [
  artifact('brief', 'markdown', 'Executive brief', BRIEF_MD),
  artifact('infographic', 'svg', 'Infographic', INFOGRAPHIC_SVG),
  artifact('timeline', 'markdown', 'Timeline', '', 'failed'),
];

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      /* best effort */
    }
  });
  // Mock the Studio artifact endpoints so the shot shows generation succeeded.
  await page.route('**/memories/**/artifacts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ artifacts: READY_ARTIFACTS }),
    });
  });
});

for (const scheme of ['dark', 'light'] as const) {
  test(`memory Studio — artifacts ready (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const memory = await seedMemory(`Knowledge preview ${scheme}`, '# Corpus\nGrounding content.');
    await page.goto(`/memory/view?id=${memory.id}`);

    await expect(page.getByRole('heading', { name: 'Studio', exact: true })).toBeVisible();
    await expect(page.getByText('Ready').first()).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `memory-studio-rail-${scheme}.png`), fullPage: true });

    // Open the infographic viewer for a second shot showing the rendered SVG.
    await page.getByTitle('View Infographic').click();
    await expect(page.getByRole('dialog', { name: 'Infographic' })).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `memory-studio-viewer-${scheme}.png`) });
  });
}
