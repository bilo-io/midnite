import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SessionSummary } from '@midnite/shared';

import { SessionCard, SessionRow } from './session-card';

afterEach(cleanup);

const session: SessionSummary = {
  id: 's1',
  projectSlug: 'task',
  projectDisplay: 'midnite',
  title: 'Fix login flow',
  subtitle: 'working on it',
  status: 'running',
  lastActivity: Date.now(),
  contextTokens: 42_000,
  contextLimit: 200_000,
};

const HREF = '/sessions/view?id=s1';

describe('session-card — Open session page link (Phase 51 F)', () => {
  it('links to the detail page from the grid card', () => {
    render(<SessionCard session={session} layout="grid" onClick={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Open session page' })).toHaveAttribute('href', HREF);
  });

  it('links to the detail page from the list card', () => {
    render(<SessionCard session={session} layout="list" onClick={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Open session page' })).toHaveAttribute('href', HREF);
  });

  it('links to the detail page from the table row', () => {
    render(<SessionRow session={session} onClick={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Open session page' })).toHaveAttribute('href', HREF);
  });

  it('clicking the card body still fires the quick-view onClick, not the link', () => {
    const onClick = vi.fn();
    render(<SessionCard session={session} layout="grid" onClick={onClick} />);
    fireEvent.click(screen.getByText('Fix login flow'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('clicking the link does not trigger the quick-view onClick', () => {
    const onClick = vi.fn();
    render(<SessionCard session={session} layout="grid" onClick={onClick} />);
    fireEvent.click(screen.getByRole('link', { name: 'Open session page' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
