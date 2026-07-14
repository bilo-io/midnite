import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { GuideOverlay } from './guide-overlay';
import { useGuide } from '@/lib/guide/use-guide';
import type { Guide } from '@/lib/guide/steps';

const GUIDE: Guide = {
  id: 'board',
  version: 1,
  label: 'Board tour',
  steps: [
    { anchor: 'board', title: 'Your board', body: 'Tasks flow left to right.' },
    { anchor: 'assistant', title: 'Replay anytime', body: 'Reopen from here.' },
  ],
};

// Render the anchor targets the overlay looks up by data-tour.
function anchors() {
  return (
    <>
      <div data-tour="board">board</div>
      <div data-tour="assistant">fab</div>
    </>
  );
}

afterEach(() => {
  act(() => useGuide.getState().stop());
  cleanup();
  window.localStorage.clear();
});
beforeEach(() => act(() => useGuide.getState().stop()));

describe('GuideOverlay', () => {
  it('renders nothing when idle', () => {
    const { container } = render(<GuideOverlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the current step, then advances and finishes', () => {
    render(
      <>
        {anchors()}
        <GuideOverlay />
      </>,
    );
    act(() => useGuide.getState().start(GUIDE));

    expect(screen.getByText('Your board')).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Replay anytime')).toBeInTheDocument();
    expect(screen.getByText('2 of 2')).toBeInTheDocument();

    // Last step's action is "Done" and ends the guide.
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(useGuide.getState().active).toBeNull();
  });

  it('marks the guide seen once it starts (drives the FAB nudge)', () => {
    render(
      <>
        {anchors()}
        <GuideOverlay />
      </>,
    );
    act(() => useGuide.getState().start(GUIDE));
    const settings = JSON.parse(window.localStorage.getItem('midnite.settings') ?? '{}');
    // Phase 67 A: seenGuides is a version map, marked at the guide's current version.
    expect(settings.seenGuides).toMatchObject({ board: 1 });
  });

  it('Skip ends the guide', () => {
    render(
      <>
        {anchors()}
        <GuideOverlay />
      </>,
    );
    act(() => useGuide.getState().start(GUIDE));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(useGuide.getState().active).toBeNull();
  });

  it('shows a graceful notice when the route has no guide', () => {
    render(<GuideOverlay />);
    act(() => useGuide.getState().start(null));
    expect(screen.getByText(/no guided tour for this page yet/i)).toBeInTheDocument();
  });
});
