import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CountPill } from './count-pill';

describe('CountPill', () => {
  it('renders the count with the generic "items" noun', () => {
    render(<CountPill count={6} />);
    expect(screen.getByText('6 items')).toBeInTheDocument();
  });

  it('uses the singular "item" for a count of 1', () => {
    render(<CountPill count={1} />);
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('renders as a rounded pill and merges a custom className', () => {
    render(<CountPill count={0} className="mr-1" />);
    const pill = screen.getByText('0 items');
    expect(pill).toHaveClass('rounded-full', 'mr-1');
  });
});
