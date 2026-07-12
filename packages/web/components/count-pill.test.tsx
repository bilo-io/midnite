import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CountPill } from './count-pill';

describe('CountPill', () => {
  it('renders the count with a pluralized noun', () => {
    render(<CountPill count={6} noun="memory" />);
    expect(screen.getByText('6 memories')).toBeInTheDocument();
  });

  it('uses the singular noun for a count of 1', () => {
    render(<CountPill count={1} noun="workflow" />);
    expect(screen.getByText('1 workflow')).toBeInTheDocument();
  });

  it('renders as a rounded pill and merges a custom className', () => {
    render(<CountPill count={0} noun="item" className="mr-1" />);
    const pill = screen.getByText('0 items');
    expect(pill).toHaveClass('rounded-full', 'mr-1');
  });
});
