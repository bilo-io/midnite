import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { PageReveal } from './page-reveal';

// PageReveal keys its wrapper on the pathname, so drive the pathname per test.
let pathname = '/tasks';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

// A stateful probe: its counter survives a re-render but resets on a remount —
// which is exactly the observable difference the pathname key controls.
function Counter() {
  const [n, setN] = useState(0);
  return (
    <button type="button" onClick={() => setN((v) => v + 1)}>
      count:{n}
    </button>
  );
}

describe('PageReveal', () => {
  it('remounts the subtree when navigating between top-level pages', () => {
    pathname = '/tasks';
    const { rerender } = render(
      <PageReveal>
        <Counter />
      </PageReveal>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('count:1')).toBeInTheDocument();

    pathname = '/projects';
    rerender(
      <PageReveal>
        <Counter />
      </PageReveal>,
    );
    // New key → fresh mount → the reveal animation replays and state resets.
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });

  it('keeps the settings subtree mounted across category switches', () => {
    pathname = '/settings';
    const { rerender } = render(
      <PageReveal>
        <Counter />
      </PageReveal>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('count:1')).toBeInTheDocument();

    // Switching category must NOT remount the settings hub (header + sidebar):
    // only the content pane re-reveals (see settings/settings-pane.tsx).
    pathname = '/settings/agents';
    rerender(
      <PageReveal>
        <Counter />
      </PageReveal>,
    );
    expect(screen.getByText('count:1')).toBeInTheDocument();
  });

  it('renders children unwrapped on opt-out routes', () => {
    pathname = '/dashboard';
    const { container } = render(
      <PageReveal>
        <span>content</span>
      </PageReveal>,
    );
    expect(container.querySelector('.page-reveal')).toBeNull();
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
