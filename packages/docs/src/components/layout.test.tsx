import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ThemeProvider } from '@midnite/ui/theme';

import type { NavGroup } from '../content/nav';
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

  it('renders the theme switcher (a @midnite/ui Tabs primitive)', () => {
    renderLayout();
    expect(screen.getByRole('tablist', { name: 'Theme' })).toBeInTheDocument();
  });
});
