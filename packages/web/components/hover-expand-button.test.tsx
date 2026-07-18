import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Workflow } from 'lucide-react';

import { HoverExpandButton } from './hover-expand-button';

afterEach(cleanup);

describe('HoverExpandButton', () => {
  it('keeps an accessible name from its label while collapsed', () => {
    render(<HoverExpandButton icon={<Workflow />} label="Graph" />);
    // The label text is present (clipped, not removed) so the control is named.
    expect(screen.getByRole('button', { name: 'Graph' })).toBeInTheDocument();
    expect(screen.getByText('Graph')).toBeInTheDocument();
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<HoverExpandButton icon={<Workflow />} label="Pause scheduling" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause scheduling' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders a link (not a button) when href is given', () => {
    render(<HoverExpandButton icon={<Workflow />} label="Graph" href="/tasks/graph" />);
    const link = screen.getByRole('link', { name: 'Graph' });
    expect(link).toHaveAttribute('href', '/tasks/graph');
    expect(screen.queryByRole('button', { name: 'Graph' })).toBeNull();
  });

  it('honours disabled', () => {
    const onClick = vi.fn();
    render(<HoverExpandButton icon={<Workflow />} label="Pause" onClick={onClick} disabled />);
    const btn = screen.getByRole('button', { name: 'Pause' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
