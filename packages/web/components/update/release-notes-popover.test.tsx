import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { fetchReleaseNotes } from '@/lib/release-notes';
import { ReleaseNotesPopover } from './release-notes-popover';

vi.mock('@/lib/release-notes', () => ({ fetchReleaseNotes: vi.fn() }));

const mockFetch = vi.mocked(fetchReleaseNotes);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockFetch.mockResolvedValue('## [1.2.3]\n\n- A shiny new thing.');
});

describe('ReleaseNotesPopover', () => {
  it('renders the version as a dialog trigger', () => {
    render(<ReleaseNotesPopover version="1.2.3" />);
    const trigger = screen.getByRole('button', { name: 'v1.2.3' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the popover and renders the fetched notes section', async () => {
    render(<ReleaseNotesPopover version="1.2.3" />);
    fireEvent.click(screen.getByRole('button', { name: 'v1.2.3' }));
    expect(screen.getByRole('dialog', { name: /release notes for v1.2.3/i })).toBeInTheDocument();
    expect(await screen.findByText('A shiny new thing.')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith('1.2.3', expect.any(AbortSignal));
  });

  it('always shows the full-changelog + release-page links', async () => {
    render(<ReleaseNotesPopover version="1.2.3" notesUrl="https://example.com/notes" />);
    fireEvent.click(screen.getByRole('button', { name: 'v1.2.3' }));

    const changelog = await screen.findByRole('link', { name: /full changelog/i });
    expect(changelog.getAttribute('href')).toContain('/changelog?v=1.2.3');

    const releasePage = screen.getByRole('link', { name: /release page/i });
    expect(releasePage).toHaveAttribute('href', 'https://example.com/notes');
  });

  it('falls back to a note (links still present) when notes cannot be fetched', async () => {
    mockFetch.mockResolvedValue(null);
    render(<ReleaseNotesPopover version="1.2.3" />);
    fireEvent.click(screen.getByRole('button', { name: 'v1.2.3' }));

    expect(await screen.findByText(/aren't available right now/i)).toBeInTheDocument();
    // The release-page link falls back to GitHub releases when no notesUrl is given.
    const releasePage = screen.getByRole('link', { name: /release page/i });
    expect(releasePage.getAttribute('href')).toContain('/releases');
  });

  it('closes on Escape', async () => {
    render(<ReleaseNotesPopover version="1.2.3" />);
    fireEvent.click(screen.getByRole('button', { name: 'v1.2.3' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
