import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownPage } from './markdown-page';

describe('MarkdownPage', () => {
  it('renders GFM markdown — headings, tables, code — as themed prose elements', () => {
    const source = ['# Architecture', '', '| Layer | Role |', '| --- | --- |', '| service | logic |', '', '`midnite serve`'].join('\n');
    render(<MarkdownPage source={source} />);

    expect(screen.getByRole('heading', { name: 'Architecture' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'service' })).toBeInTheDocument();
    expect(screen.getByText('midnite serve')).toBeInTheDocument();
  });

  it('syntax-highlights fenced code blocks with highlight.js', () => {
    const { container } = render(<MarkdownPage source={['```ts', 'const x = 1;', '```'].join('\n')} />);
    const code = container.querySelector('code.hljs');
    expect(code).not.toBeNull();
    expect(code).toHaveClass('language-ts');
    expect(container.querySelector('.hljs-keyword')).not.toBeNull();
  });

  it('does not leak react-markdown’s hast `node` prop onto the DOM', () => {
    const { container } = render(<MarkdownPage source={'plain paragraph'} />);
    expect(container.querySelector('[node]')).toBeNull();
  });
});
