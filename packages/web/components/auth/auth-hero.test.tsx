import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AUTH_HERO_COPY, AuthHero, pickAuthHeroCopy } from './auth-hero';
import { SETTINGS_STORAGE_KEY } from '@/lib/app-settings';

// The starfield canvas is proven via a Storybook shot, not pixel asserts — stub it
// so these DOM-level tests stay fast and don't touch a jsdom canvas.
vi.mock('@/components/auth/constellation-background', () => ({
  ConstellationBackground: () => null,
}));

const TITLES = AUTH_HERO_COPY.map((c) => c.title);
const SUBTITLES = AUTH_HERO_COPY.map((c) => c.subtitle);

/** Force reduced motion so the typewriter resolves the copy immediately. */
function reduceMotion() {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ motion: 'reduced' }));
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('pickAuthHeroCopy', () => {
  it('always returns a pair from the curated login set', () => {
    for (const r of [0, 0.15, 0.5, 0.99]) {
      const copy = pickAuthHeroCopy(() => r);
      expect(AUTH_HERO_COPY).toContainEqual(copy);
    }
  });
});

describe('AuthHero', () => {
  beforeEach(reduceMotion);

  it('renders a login-specific title + subtitle (reduced motion → full copy)', () => {
    render(<AuthHero />);
    const heading = screen.getByRole('heading', { level: 2 });
    // The rendered copy is one of the curated login pairs (not dashboard/quote copy).
    expect(TITLES).toContain(heading.textContent);
    const idx = TITLES.indexOf(heading.textContent ?? '');
    expect(screen.getByText(SUBTITLES[idx]!)).toBeInTheDocument();
  });

  it('shows the brand wordmark', () => {
    render(<AuthHero />);
    expect(screen.getByText('midnite')).toBeInTheDocument();
  });
});
