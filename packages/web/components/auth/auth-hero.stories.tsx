import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { AUTH_HERO_COPY, AuthHero } from './auth-hero';
import { SETTINGS_STORAGE_KEY } from '@/lib/app-settings';

// The hero renders the title as a headline with the trailing full stop dropped
// (auth-hero.tsx: `copy.title.replace(/\.$/, '')`), so mirror that here to compare
// against what's actually on screen.
const TITLES = AUTH_HERO_COPY.map((c) => c.title.replace(/\.$/, ''));

const meta = {
  title: 'Auth/AuthHero',
  component: AuthHero,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-[700px] w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AuthHero>;

export default meta;
type Story = StoryObj<typeof meta>;

async function expectLoginCopy(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const heading = await canvas.findByRole('heading', { level: 2 });
  // The hero renders one of the curated *login* pairs — not dashboard/quote copy.
  await expect(TITLES.some((t) => t.startsWith(heading.textContent ?? ''))).toBe(true);
  // The wordmark types out (and its intro waits on the layout's starfield, absent
  // in isolation), so assert the brand via the always-present logo image instead.
  await expect(canvas.getByAltText('midnite')).toBeInTheDocument();
}

/** The living knowledge-graph starfield behind the animated login copy. */
export const Default: Story = {
  play: async ({ canvasElement }) => expectLoginCopy(canvasElement),
};

/** Reduced motion: static star field + a few pre-lit constellations, copy resolves at once. */
export const ReducedMotion: Story = {
  beforeEach: () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ motion: 'reduced' }));
    return () => window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = await canvas.findByRole('heading', { level: 2 });
    // With motion off the typewriter short-circuits — a full title, not a prefix.
    await expect(TITLES).toContain(heading.textContent);
  },
};

/**
 * The full split: form column (left ⅓) beside the hero (right ⅔). Composed
 * directly here so the shot is deterministic; the desktop-only *gating* is unit-
 * tested in `layout.test.tsx`.
 */
export const SplitScreen: Story = {
  // Resolve motion so the hero's title/wordmark settle deterministically in
  // isolation (the motion-on intro waits on the layout starfield, absent here),
  // avoiding a transient empty-heading during the type-out.
  beforeEach: () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ motion: 'reduced' }));
    return () => window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  },
  render: () => (
    <div className="flex h-[700px] w-full bg-background">
      <div className="flex w-1/3 flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
            Sign in to midnite
          </h1>
          <div
            role="group"
            aria-label="form"
            className="h-40 rounded-md border border-dashed border-border"
          />
        </div>
      </div>
      <div className="relative w-2/3">
        <AuthHero />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Sign in to midnite')).toBeInTheDocument();
    await expectLoginCopy(canvasElement);
  },
};
