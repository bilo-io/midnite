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
});
