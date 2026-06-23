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

  it('does not leak react-markdown’s hast `node` prop onto the DOM', () => {
    const { container } = render(<MarkdownPage source={'plain paragraph'} />);
    expect(container.querySelector('[node]')).toBeNull();
  });
});
