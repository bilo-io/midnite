import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChangelogPage } from './changelog-page';

const SOURCE = [
  '# Changelog',
  '',
  '## [0.2.0] - 2026-07-18',
  '',
  '- Release-notes popover.',
  '',
  '## [0.1.0] - 2026-06-26',
  '',
  '- First release.',
].join('\n');

// jsdom has no scrollIntoView; stub it so the scroll effect can run.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ChangelogPage source={SOURCE} />
    </MemoryRouter>,
  );
}

describe('ChangelogPage', () => {
  it('renders the changelog markdown', () => {
    renderAt('/changelog');
    expect(screen.getByRole('heading', { name: 'Changelog' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /\[0\.2\.0\]/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /\[0\.1\.0\]/ })).toBeInTheDocument();
  });

  it('scrolls to and focuses the ?v= version section', () => {
    renderAt('/changelog?v=0.1.0');
    const heading = screen.getByRole('heading', { name: /\[0\.1\.0\]/ });
    expect(heading.scrollIntoView).toHaveBeenCalled();
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('does not scroll when no ?v= is given', () => {
    renderAt('/changelog');
    const heading = screen.getByRole('heading', { name: /\[0\.2\.0\]/ });
    expect(heading.scrollIntoView).not.toHaveBeenCalled();
  });
});
