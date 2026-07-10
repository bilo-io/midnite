import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownPreview } from './markdown-preview';

describe('MarkdownPreview', () => {
  it('renders GFM markdown — headings, tables, inline code', () => {
    const content = ['# Title', '', '| a | b |', '| --- | --- |', '| 1 | 2 |', '', 'run `midnite serve`'].join(
      '\n',
    );
    render(<MarkdownPreview content={content} />);

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('midnite serve')).toBeInTheDocument();
  });

  it('syntax-highlights a fenced code block with highlight.js (.hljs token spans)', () => {
    const content = ['```ts', 'const x = 1;', '```'].join('\n');
    const { container } = render(<MarkdownPreview content={content} />);

    // rehype-highlight stamps `hljs` + `language-ts` on the <code> and wraps
    // tokens in `.hljs-*` spans coloured by the shared palette.
    const code = container.querySelector('code.hljs');
    expect(code).not.toBeNull();
    expect(code).toHaveClass('language-ts');
    expect(container.querySelector('.hljs-keyword')).not.toBeNull();
    expect(container.querySelector('.hljs-number')).not.toBeNull();
  });

  it('leaves inline code as a plain chip (no hljs highlighting)', () => {
    const { container } = render(<MarkdownPreview content={'inline `code` here'} />);
    expect(container.querySelector('.hljs')).toBeNull();
    expect(screen.getByText('code')).toBeInTheDocument();
  });
});
