import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedMemory } from './helpers/gateway';

// Phase 65 E — preview shots of the file-backed Studio artifacts (audio + video).
// Real generation needs a TTS/ffmpeg provider the e2e gateway has none of, so we
// mock the artifacts endpoints to show the end states: a *ready* audio overview
// (a working <audio> player fed a small real mp3 via a routed file response), a
// *degraded* video overview (slide outline + honest "no provider" hint), plus the
// text/infographic rows from Theme D. Preview artifacts, not baseline assertions.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
const DEMO_MP3 = readFileSync(resolve(process.cwd(), 'e2e/fixtures/studio/demo.mp3'));

const TRANSCRIPT = `# Rockets, explained

_Two-host audio overview — transcript_

**Host A:** So why do rockets actually go up?

**Host B:** Newton's third law — throw mass out the back fast, and the reaction pushes the ship forward.

**Host A:** And the staging?

**Host B:** Each stage burns out and drops away, so you stop hauling dead weight.`;

const OUTLINE = `# Rockets

_Narrated slideshow — outline_

## 1. Thrust
- Action and reaction
- Mass out the back

> Rockets push mass down so the ship goes up.

## 2. Staging
- Drop spent stages

> Shedding dead weight keeps the climb efficient.`;

function artifact(
  kind: string,
  format: string,
  title: string,
  content: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: `art-${kind}`,
    memoryId: 'preview',
    kind,
    format,
    title,
    content,
    status: 'ready',
    error: null,
    filePath: null,
    mimeType: null,
    fileSize: null,
    degraded: false,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
    ...extra,
  };
}

const ARTIFACTS = [
  artifact('brief', 'markdown', 'Executive brief', '# Executive brief\n\nA concise summary of the corpus.'),
  artifact('audio-overview', 'audio', 'Audio overview', TRANSCRIPT, {
    filePath: 'memory-studio/art-audio-overview.mp3',
    mimeType: 'audio/mpeg',
    fileSize: DEMO_MP3.length,
  }),
  artifact('video-overview', 'video', 'Video', OUTLINE, { degraded: true }),
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
  // Show the generated end-state without a provider: mock the list, and serve the
  // routed audio file so the <audio> player is a real, playable control.
  await page.route('**/memories/**/artifacts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ artifacts: ARTIFACTS }),
    });
  });
  await page.route('**/artifacts/art-audio-overview/file', async (route) => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: DEMO_MP3 });
  });
});

for (const scheme of ['dark', 'light'] as const) {
  test(`memory Studio media — rail + players (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const memory = await seedMemory(`Studio media ${scheme}`, '# Corpus\nGrounding content.');
    await page.goto(`/memory/view?id=${memory.id}`);

    await expect(page.getByRole('heading', { name: 'Studio', exact: true })).toBeVisible();
    await expect(page.getByText('Audio overview')).toBeVisible();
    await expect(page.getByText('Video', { exact: true })).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `memory-studio-media-rail-${scheme}.png`), fullPage: true });

    // Audio overview viewer — a real, playable <audio> control over the transcript.
    await page.getByTitle('View Audio overview').click();
    await expect(page.getByRole('dialog', { name: 'Audio overview' })).toBeVisible();
    await expect(page.getByLabel('Audio overview audio')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `memory-studio-audio-viewer-${scheme}.png`) });
    await page.getByRole('button', { name: 'Close' }).click();

    // Video overview viewer — degraded to the slide outline + honest hint.
    await page.getByTitle('View Video').click();
    await expect(page.getByRole('dialog', { name: 'Video' })).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `memory-studio-video-degraded-${scheme}.png`) });
  });
}
