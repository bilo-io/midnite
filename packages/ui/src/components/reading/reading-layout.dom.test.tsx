import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReadingLayout } from './reading-layout';
import { READING_ARTICLE_ATTR } from './table-of-contents';

function sidebarColumnOf(nav: HTMLElement): HTMLElement {
  const column = nav.parentElement;
  if (!column) throw new Error('sidebar has no wrapping column');
  return column;
}

describe('ReadingLayout', () => {
  it('marks its article so an unwired TableOfContents can find it', () => {
    const { container } = render(<ReadingLayout>Body</ReadingLayout>);
    expect(container.querySelector(`[${READING_ARTICLE_ATTR}]`)).not.toBeNull();
  });

  it('omits the sidebar and TOC columns when no slot is passed', () => {
    render(<ReadingLayout>Body</ReadingLayout>);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('hides the sidebar below md by default — the host has its own mobile nav', () => {
    render(
      <ReadingLayout sidebar={<nav aria-label="Docs">Nav</nav>}>Body</ReadingLayout>,
    );
    const column = sidebarColumnOf(screen.getByRole('navigation', { name: 'Docs' }));
    expect(column.className).toContain('hidden');
    expect(column.className).toContain('md:block');
  });

  it('keeps the sidebar inline on mobile when it is the only navigation', () => {
    render(
      <ReadingLayout sidebarMobile="inline" sidebar={<nav aria-label="Legal">Nav</nav>}>
        Body
      </ReadingLayout>,
    );
    const column = sidebarColumnOf(screen.getByRole('navigation', { name: 'Legal' }));
    expect(column.className).not.toContain('hidden');
  });

  it('applies sidebarClassName so the host can make its column sticky', () => {
    render(
      <ReadingLayout
        sidebar={<nav aria-label="Legal">Nav</nav>}
        sidebarClassName="md:sticky md:top-24"
      >
        Body
      </ReadingLayout>,
    );
    expect(sidebarColumnOf(screen.getByRole('navigation', { name: 'Legal' })).className).toContain(
      'md:sticky',
    );
  });

  it('renders the TOC rail behind an xl gate', () => {
    render(<ReadingLayout toc={<nav aria-label="On this page">Toc</nav>}>Body</ReadingLayout>);
    expect(screen.getByRole('complementary').className).toContain('xl:block');
  });

  it('lets the host override the shell and article classes', () => {
    const { container } = render(
      <ReadingLayout className="container py-28" articleClassName="max-w-2xl">
        Body
      </ReadingLayout>,
    );
    expect(container.firstElementChild?.className).toContain('py-28');
    expect(container.querySelector(`[${READING_ARTICLE_ATTR}]`)?.className).toContain('max-w-2xl');
  });
});
