import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Markdown } from './markdown';

describe('Markdown', () => {
  it('renders headings and inline code', () => {
    render(<Markdown content={'# Terms\n\nSee `clause 4`.'} />);
    expect(screen.getByRole('heading', { name: 'Terms' })).toBeInTheDocument();
    expect(screen.getByText('clause 4')).toBeInTheDocument();
  });

  it('syntax-highlights a fenced code block with highlight.js', () => {
    const { container } = render(<Markdown content={['```ts', 'const x = 1;', '```'].join('\n')} />);
    const code = container.querySelector('code.hljs');
    expect(code).not.toBeNull();
    expect(code).toHaveClass('language-ts');
    expect(container.querySelector('.hljs-keyword')).not.toBeNull();
  });

  it('renders GFM tables through the shared map', () => {
    render(
      <Markdown
        content={['| Term | Meaning |', '| --- | --- |', '| Service | the app |'].join('\n')}
      />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Term' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'the app' })).toBeInTheDocument();
  });

  // The point of the Phase 80 migration: legal headings are anchorable, so the
  // right-rail TOC has something to scan and deep-links resolve. These pages
  // configure no rehype-slug — the ids come from the shared Prose map.
  it('gives h2/h3 self-slugged ids for in-page anchors', () => {
    render(<Markdown content={'## Data we collect\n\n### Usage telemetry'} />);
    expect(screen.getByRole('heading', { name: 'Data we collect' }).id).toBe('data-we-collect');
    expect(screen.getByRole('heading', { name: 'Usage telemetry' }).id).toBe('usage-telemetry');
  });

  it('dedupes ids when two sections share a title', () => {
    render(<Markdown content={'## Retention\n\n## Retention'} />);
    expect(screen.getAllByRole('heading', { name: 'Retention' }).map((h) => h.id)).toEqual([
      'retention',
      'retention-1',
    ]);
  });

  it('routes root-relative links through next/link, and external ones off-site', () => {
    render(<Markdown content={'See [the EULA](/legal/eula) and [example](https://example.com).'} />);

    const internal = screen.getByRole('link', { name: 'the EULA' });
    expect(internal).toHaveAttribute('href', '/legal/eula');
    expect(internal).not.toHaveAttribute('target');

    const external = screen.getByRole('link', { name: 'example' });
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });
});
