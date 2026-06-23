import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock the index module: it imports the compiled-MDX content glob, which the
// MDX-less vitest runner can't transform. A fixed index keeps the test focused
// on DocSearch's behaviour (filter → navigate); the index build is covered by
// search.test.ts.
vi.mock('../content/search-index', () => ({
  searchIndex: [
    { path: '/components/button', title: 'Button', section: 'Components', headings: ['Variants'] },
    { path: '/architecture', title: 'Architecture', section: 'Architecture', headings: ['Gateway'] },
  ],
}));

import { DocSearch } from './doc-search';

function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="path">{pathname}</div>;
}

function setup() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <DocSearch />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('DocSearch', () => {
  it('filters by title and navigates to the matching page', () => {
    setup();
    const input = screen.getByLabelText('Search docs');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Button' } });

    fireEvent.click(screen.getByText('Button', { selector: 'span' }));

    expect(screen.getByTestId('path')).toHaveTextContent('/components/button');
  });

  it('matches a heading and surfaces it beside the section', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Search docs'), { target: { value: 'gateway' } });
    // The Architecture page has no title/section match — only the "Gateway" heading.
    expect(screen.getByText(/Architecture · Gateway/)).toBeInTheDocument();
  });

  it('shows a no-results message for an unknown query', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Search docs'), { target: { value: 'zzzznotathing' } });
    expect(screen.getByText('No results')).toBeInTheDocument();
  });
});
