import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';

import { GuideOverlay } from './guide-overlay';
import { useGuide } from '@/lib/guide/use-guide';
import type { Guide } from '@/lib/guide/steps';

// Content now lives in the `guide` catalog (Phase 82 D) — the overlay resolves
// titles/bodies by id + anchor, so this fixture reuses the real board guide's
// first and last steps and the tests assert the real en-GB copy.
const GUIDE: Guide = {
  id: 'board',
  version: 1,
  steps: [{ anchor: 'board' }, { anchor: 'assistant' }],
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

  // Phase 67 B — interactive steps.
  const INTERACTIVE: Guide = {
    id: 'board',
    version: 1,
    steps: [
      { anchor: 'board', advanceOn: 'click' },
      { anchor: 'assistant' },
    ],
  };

  it('advanceOn:"click" advances when the anchored element is clicked', () => {
    render(
      <>
        {anchors()}
        <GuideOverlay />
      </>,
    );
    act(() => useGuide.getState().start(INTERACTIVE));
    expect(screen.getByText('Your board')).toBeInTheDocument();

    // Clicking the real anchored element (through the spotlight hole) advances.
    act(() => {
      screen.getByText('board').click();
    });
    expect(screen.getByText('Replay anytime')).toBeInTheDocument();
    expect(useGuide.getState().stepIndex).toBe(1);
  });

  it('does not auto-advance when the step has no advanceOn', () => {
    render(
      <>
        {anchors()}
        <GuideOverlay />
      </>,
    );
    // GUIDE's first step is not interactive.
    act(() => useGuide.getState().start(GUIDE));
    act(() => {
      screen.getByText('board').click();
    });
    // Still on the first step — a plain anchor click is a no-op for the tour.
    expect(useGuide.getState().stepIndex).toBe(0);
    expect(screen.getByText('Your board')).toBeInTheDocument();
  });

  it('clicking the dimmed area (a curtain) ends the tour', () => {
    render(
      <>
        {anchors()}
        <GuideOverlay />
      </>,
    );
    act(() => useGuide.getState().start(GUIDE));
    // The click-catcher curtains are the aria-hidden <div>s in the portal.
    const curtain = document.body.querySelector<HTMLElement>('div[aria-hidden="true"]');
    expect(curtain).not.toBeNull();
    act(() => curtain!.click());
    expect(useGuide.getState().active).toBeNull();
  });

  it('renders the French copy under fr-FR (Phase 82 D)', () => {
    render(
      <>
        {anchors()}
        <GuideOverlay />
      </>,
      { locale: 'fr-FR' },
    );
    act(() => useGuide.getState().start(GUIDE));

    expect(screen.getByText('Votre tableau')).toBeInTheDocument();
    expect(screen.getByText('1 sur 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Passer' })).toBeInTheDocument();
  });
});
