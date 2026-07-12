import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@midnite/ui/theme';

import type { NavGroup } from '../content/nav';

// Layout mounts DocSearch, whose index module pulls in the compiled-MDX content
// glob the MDX-less vitest runner can't transform — stub it out.
vi.mock('../content/search-index', () => ({ searchIndex: [] }));

import { Layout } from './layout';

const nav: NavGroup[] = [
  { section: 'Overview', items: [{ path: '/', title: 'Overview' }] },
  { section: 'Components', items: [{ path: '/components/button', title: 'Button' }] },
];

function renderLayout() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Layout nav={nav}>
          <p>page body</p>
        </Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('Layout', () => {
  it('renders the grouped sidebar nav + content from the @midnite/ui-built shell', () => {
    renderLayout();
    expect(screen.getByRole('heading', { name: 'Components' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Button' })).toHaveAttribute('href', '/components/button');
    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('renders a Download call-to-action linking to getting-started', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/getting-started');
  });

  it('renders the theme switcher (a @midnite/ui Tabs primitive)', () => {
    renderLayout();
    expect(screen.getByRole('tablist', { name: 'Theme' })).toBeInTheDocument();
  });

  it('opens the mobile nav drawer (a second sidebar instance) on the hamburger', () => {
    renderLayout();
    // Closed: only the in-flow (md+) sidebar is mounted.
    expect(screen.getAllByRole('heading', { name: 'Components' })).toHaveLength(1);

    fireEvent.click(screen.getByLabelText('Open navigation'));

    expect(screen.getAllByRole('heading', { name: 'Components' })).toHaveLength(2);
    expect(screen.getByLabelText('Close navigation')).toBeInTheDocument();
  });

  it('exposes the client-side doc search in the header', () => {
    renderLayout();
    expect(screen.getByLabelText('Search docs')).toBeInTheDocument();
  });
});
