import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mediaUp } from '@/lib/breakpoints';
import { DesktopOnly } from './desktop-only';

// Minimal controllable matchMedia (mirrors hooks/use-media-query.test.tsx):
// the lg-and-up query decides whether DesktopOnly renders children or the notice.
function installMatchMedia(matchesFor: (query: string) => boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      matches: matchesFor(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('DesktopOnly', () => {
  let restore: () => void;
  afterEach(() => restore?.());

  it('renders children at desktop width (>= lg)', () => {
    restore = installMatchMedia((q) => q === mediaUp('lg'));
    render(
      <DesktopOnly label="The office">
        <div>canvas content</div>
      </DesktopOnly>,
    );
    expect(screen.getByText('canvas content')).toBeInTheDocument();
    expect(screen.queryByText(/best viewed on desktop/i)).not.toBeInTheDocument();
  });

  it('renders the notice below the desktop breakpoint', () => {
    restore = installMatchMedia(() => false);
    render(
      <DesktopOnly label="The office">
        <div>canvas content</div>
      </DesktopOnly>,
    );
    expect(screen.getByText('The office is best viewed on desktop')).toBeInTheDocument();
    expect(screen.queryByText('canvas content')).not.toBeInTheDocument();
  });

  it('uses the provided label in the notice', () => {
    restore = installMatchMedia(() => false);
    render(
      <DesktopOnly label="The workflow editor">
        <div>canvas content</div>
      </DesktopOnly>,
    );
    expect(
      screen.getByText('The workflow editor is best viewed on desktop'),
    ).toBeInTheDocument();
  });
});
