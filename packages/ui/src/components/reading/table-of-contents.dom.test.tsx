import { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReadingLayout } from './reading-layout';
import { collectHeadings, TableOfContents } from './table-of-contents';

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

  it('reads the heading text through nested markup', () => {
    const root = document.createElement('div');
    root.innerHTML = '<h2 id="the-cn-helper">The <code>cn()</code> helper</h2>';
    expect(collectHeadings(root)[0]).toEqual({
      id: 'the-cn-helper',
      text: 'The cn() helper',
      level: 2,
    });
  });
});

const ARTICLE = `
  <h2 id="install">Install</h2>
  <h3 id="peer-deps">Peer deps</h3>
  <h2 id="usage">Usage</h2>
`;

/** The zero-wiring path: ReadingLayout marks the article, the rail finds it. */
function renderInLayout(html: string) {
  return render(
    <ReadingLayout toc={<TableOfContents />}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </ReadingLayout>,
  );
}

describe('TableOfContents', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists the article headings found via the layout, with no ref wiring', () => {
    renderInLayout(ARTICLE);
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Install' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Peer deps' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Usage' })).toBeTruthy();
  });

  it('renders nothing for a single-section page', () => {
    renderInLayout('<h2 id="only">Only section</h2>');
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('renders nothing when there is no article to scan', () => {
    render(<TableOfContents />);
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('marks the first section active until the spy says otherwise', () => {
    renderInLayout(ARTICLE);
    expect(screen.getByRole('button', { name: 'Install' }).getAttribute('aria-current')).toBe(
      'location',
    );
    expect(screen.getByRole('button', { name: 'Usage' }).getAttribute('aria-current')).toBeNull();
  });

  it('scrolls to the section and moves the highlight on click', () => {
    renderInLayout(ARTICLE);
    const scrollIntoView = vi.fn();
    // jsdom has no layout, so the heading's scrollIntoView is a stub.
    const usage = document.getElementById('usage');
    if (usage) usage.scrollIntoView = scrollIntoView;

    fireEvent.click(screen.getByRole('button', { name: 'Usage' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(screen.getByRole('button', { name: 'Usage' }).getAttribute('aria-current')).toBe(
      'location',
    );
    expect(screen.getByRole('button', { name: 'Install' }).getAttribute('aria-current')).toBeNull();
  });

  it('scopes the scan to an explicitly passed container', () => {
    function TwoArticles() {
      const second = useRef<HTMLElement | null>(null);
      return (
        <>
          <article data-reading-article>
            <h2 id="first-a">First A</h2>
            <h2 id="first-b">First B</h2>
          </article>
          <article ref={second}>
            <h2 id="second-a">Second A</h2>
            <h2 id="second-b">Second B</h2>
          </article>
          <TableOfContents containerRef={second} />
        </>
      );
    }
    render(<TwoArticles />);

    expect(screen.getByRole('button', { name: 'Second A' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'First A' })).toBeNull();
  });

  it('re-scans when the article content is replaced', async () => {
    const { rerender } = render(
      <ReadingLayout toc={<TableOfContents />}>
        <div dangerouslySetInnerHTML={{ __html: ARTICLE }} />
      </ReadingLayout>,
    );
    expect(screen.getByRole('button', { name: 'Install' })).toBeTruthy();

    rerender(
      <ReadingLayout toc={<TableOfContents scanKey="page-2" />}>
        <div
          dangerouslySetInnerHTML={{
            __html: '<h2 id="alpha">Alpha</h2><h2 id="beta">Beta</h2>',
          }}
        />
      </ReadingLayout>,
    );

    expect(await screen.findByRole('button', { name: 'Alpha' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull();
  });

  it('observes the headings for scroll-spy when IntersectionObserver exists', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observe;
        disconnect = disconnect;
        unobserve = vi.fn();
        takeRecords = vi.fn(() => []);
        root = null;
        rootMargin = '';
        thresholds = [];
      },
    );

    const { unmount } = renderInLayout(ARTICLE);
    expect(observe).toHaveBeenCalledTimes(3);

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
