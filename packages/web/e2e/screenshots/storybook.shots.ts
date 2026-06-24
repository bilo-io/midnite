import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { request, test } from '@playwright/test';

import { SCREENSHOTS_DIR, STORYBOOK_ORIGIN } from '../config';

/**
 * Phase 10 Theme E1 — per-story Storybook screenshot capture.
 *
 * Drives the Storybook dev server (port 6007, separate from the `web:storybook`
 * default of 6006 so they never collide) and saves a PNG of every story in both
 * **light and dark** themes, at a fixed 1280×900 viewport.
 *
 * Theme selection uses Storybook's `?globals=theme:<value>` URL parameter. The
 * `withTheme` preview decorator reads it to seed `localStorage[THEME_STORAGE_KEY]`
 * and remount `ThemeProvider`, which toggles the `dark` class on `<html>`. This
 * works regardless of `prefers-color-scheme` because Tailwind's dark mode is
 * class-based in this project, not media-query-based.
 *
 * Story discovery uses `GET /index.json` (Storybook 7+ standard endpoint), so
 * new stories are captured automatically without any manual bookkeeping.
 *
 * Output: `e2e/__shots__/stories/<component>/<story>-<theme>.png` (gitignored).
 * Run with `moon run web:screenshots`; complements the page-level captures in
 * `pages.shots.ts`. Visual baseline diffing (toHaveScreenshot) is Theme E2.
 */

type StoryEntry = {
  id: string;
  title: string;
  name: string;
  type: 'story' | 'docs';
};

type StoryIndex = {
  v: number;
  entries: Record<string, StoryEntry>;
};

function slugComponent(title: string): string {
  return title
    .replace(/\s*\/\s*/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function slugStory(name: string): string {
  return name.replace(/\s+/g, '-').toLowerCase();
}

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR, 'stories');
const THEMES = ['light', 'dark'] as const;

let stories: StoryEntry[] = [];

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  // Fetch the Storybook index to enumerate all renderable stories. `docs` entries
  // are MDX pages, not interactive components — skip them.
  const ctx = await request.newContext({ baseURL: STORYBOOK_ORIGIN });
  const resp = await ctx.get('/index.json');
  const index = (await resp.json()) as StoryIndex;
  stories = Object.values(index.entries).filter((e) => e.type === 'story');
  await ctx.dispose();
});

for (const theme of THEMES) {
  test.describe(`stories / ${theme}`, () => {
    test.use({ colorScheme: theme === 'dark' ? 'dark' : 'light' });

    test(`capture all stories (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      for (const story of stories) {
        const dir = join(OUT, slugComponent(story.title));
        mkdirSync(dir, { recursive: true });

        // The `globals` query param drives the `withTheme` preview decorator
        // (sets localStorage + remounts ThemeProvider → dark class on <html>).
        await page.goto(
          `/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story&globals=theme:${theme}`,
        );

        // Storybook 7+ sets `data-story-rendered` on <body> once the story is
        // mounted. Fall back to waiting for any child of #storybook-root if the
        // attribute isn't present (e.g. older story renderers).
        await page
          .locator('body[data-story-rendered]')
          .waitFor({ timeout: 15_000 })
          .catch(() => page.locator('#storybook-root > *').waitFor({ timeout: 5_000 }));

        await page.screenshot({
          path: join(dir, `${slugStory(story.name)}-${theme}.png`),
          fullPage: false,
        });
      }
    });
  });
}
