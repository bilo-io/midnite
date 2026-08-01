import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Prose, proseComponents } from './prose';
import { ReadingLayoutProvider, type ReadingLinkProps } from './reading-provider';

const { h2: H2, h3: H3, a: A } = proseComponents;

describe('self-slugifying headings', () => {
  it('derives an id from the heading text', () => {
    render(
      <Prose>
        <H2>Getting Started</H2>
      </Prose>,
    );
    expect(screen.getByRole('heading', { name: 'Getting Started' }).id).toBe('getting-started');
  });

  it('slugifies text wrapped in markup', () => {
    render(
      <Prose>
        <H2>
          The <code>cn()</code> helper
        </H2>
      </Prose>,
    );
    expect(screen.getByRole('heading', { level: 2 }).id).toBe('the-cn-helper');
  });

  it('dedupes duplicate headings within one Prose', () => {
    render(
      <Prose>
        <H2>Overview</H2>
        <H3>Overview</H3>
      </Prose>,
    );
    const ids = screen.getAllByRole('heading').map((h) => h.id);
    expect(ids).toEqual(['overview', 'overview-1']);
  });

  it('honours an explicit id so a deep-link survives a retitle', () => {
    render(
      <Prose>
        <H2 id="pinned">Some New Title</H2>
      </Prose>,
    );
    expect(screen.getByRole('heading', { level: 2 }).id).toBe('pinned');
  });

  it('keeps ids stable across a re-render', () => {
    const { rerender } = render(
      <Prose>
        <H2>Overview</H2>
        <H2>Overview</H2>
      </Prose>,
    );
    const before = screen.getAllByRole('heading').map((h) => h.id);

    rerender(
      <Prose>
        <H2>Overview</H2>
        <H2>Overview</H2>
      </Prose>,
    );
    expect(screen.getAllByRole('heading').map((h) => h.id)).toEqual(before);
  });

  it('still slugifies outside a Prose, just without dedupe', () => {
    render(<H2>Standalone Heading</H2>);
    expect(screen.getByRole('heading', { level: 2 }).id).toBe('standalone-heading');
  });
});

describe('prose links', () => {
  it('renders root-relative links through the injected component', () => {
    function TestLink({ href, className, children }: ReadingLinkProps) {
      return (
        <a data-router-link href={`#${href}`} className={className}>
          {children}
        </a>
      );
    }
    render(
      <ReadingLayoutProvider linkComponent={TestLink}>
        <A href="/app/tasks">Tasks</A>
      </ReadingLayoutProvider>,
    );

    const link = screen.getByRole('link', { name: 'Tasks' });
    expect(link.hasAttribute('data-router-link')).toBe(true);
    // The adapter got the raw path and applied the host's own hash prefixing.
    expect(link.getAttribute('href')).toBe('#/app/tasks');
  });

  it('falls back to a plain anchor with no provider mounted', () => {
    render(<A href="/app/tasks">Tasks</A>);
    expect(screen.getByRole('link', { name: 'Tasks' }).getAttribute('href')).toBe('/app/tasks');
  });

  it('opens external links off-site in a new tab', () => {
    render(<A href="https://example.com">Example</A>);
    const link = screen.getByRole('link', { name: 'Example' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer noopener');
  });

  it('leaves in-page anchors as plain same-tab jumps', () => {
    render(<A href="#install">Install</A>);
    const link = screen.getByRole('link', { name: 'Install' });
    expect(link.getAttribute('href')).toBe('#install');
    expect(link.getAttribute('target')).toBeNull();
  });
});
