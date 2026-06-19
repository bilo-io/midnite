import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// next/navigation's useRouter throws outside the App Router runtime, so stub it.
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { CommandPalette } from './command-palette';

/** Fire the global ⌘K shortcut the component listens for on window. */
const pressCmdK = () => fireEvent.keyDown(window, { key: 'k', metaKey: true });

describe('CommandPalette', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => push.mockReset());

  it('stays closed until ⌘K, then lists every enabled surface', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).toBeNull();

    pressCmdK();

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    // 8 toggleable features + 3 always-on destinations (Agents, Profile, Settings).
    expect(screen.getAllByRole('button')).toHaveLength(11);
  });

  it('⌘K toggles it shut again', () => {
    render(<CommandPalette />);
    pressCmdK();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    pressCmdK();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('matches on the description, not just the label', () => {
    render(<CommandPalette />);
    pressCmdK();
    // "kanban" appears only in the Tasks feature description.
    fireEvent.change(screen.getByPlaceholderText('Jump to…'), { target: { value: 'kanban' } });
    const results = screen.getAllByRole('button');
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveTextContent('Tasks');
  });

  it('shows an empty state when nothing matches', () => {
    render(<CommandPalette />);
    pressCmdK();
    fireEvent.change(screen.getByPlaceholderText('Jump to…'), { target: { value: 'zzzznope' } });
    expect(screen.getByText('No matches.')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('navigates to the top result on Enter and closes', () => {
    render(<CommandPalette />);
    pressCmdK();
    const input = screen.getByPlaceholderText('Jump to…');
    fireEvent.change(input, { target: { value: 'workflows' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith('/workflows');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape without navigating', () => {
    render(<CommandPalette />);
    pressCmdK();
    fireEvent.keyDown(screen.getByPlaceholderText('Jump to…'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
