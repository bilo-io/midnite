import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { collectHeadings, TableOfContents } from './table-of-contents';

// Render an article (the TOC scans `main article` out of the live document) next
// to the rail under a router.
function renderToc(article: string) {
  return render(
    <MemoryRouter>
      <main>
        <article dangerouslySetInnerHTML={{ __html: article }} />
      </main>
      <TableOfContents />
    </MemoryRouter>,
  );
}

describe('collectHeadings', () => {
  it('extracts anchored h2/h3 in document order with level + text', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <h1 id="title">Title</h1>
      <h2 id="install">Install</h2>
      <h3 id="peer-deps">Peer deps</h3>
      <h2 id="usage">Usage</h2>
      <h2>no id — skipped</h2>
    `;
    expect(collectHeadings(root)).toEqual([
      { id: 'install', text: 'Install', level: 2 },
      { id: 'peer-deps', text: 'Peer deps', level: 3 },
      { id: 'usage', text: 'Usage', level: 2 },
    ]);
  });
});

describe('TableOfContents', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('lists the page sections and marks the first active', () => {
    renderToc('<h2 id="install">Install</h2><h2 id="usage">Usage</h2>');
    const install = screen.getByRole('button', { name: 'Install' });
    const usage = screen.getByRole('button', { name: 'Usage' });
    expect(install).toBeInTheDocument();
    expect(usage).toBeInTheDocument();
    expect(install).toHaveAttribute('aria-current', 'location');
    expect(usage).not.toHaveAttribute('aria-current');
  });

  it('scrolls to a section and moves the active marker on click', () => {
    renderToc('<h2 id="install">Install</h2><h2 id="usage">Usage</h2>');
    fireEvent.click(screen.getByRole('button', { name: 'Usage' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Usage' })).toHaveAttribute('aria-current', 'location');
  });

  it('renders nothing for a single-section page', () => {
    const { container } = renderToc('<h2 id="solo">Solo</h2>');
    expect(container.querySelector('nav')).toBeNull();
  });
});
