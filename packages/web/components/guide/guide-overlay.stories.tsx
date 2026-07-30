import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { GuideOverlay } from './guide-overlay';
import { useGuide } from '@/lib/guide/use-guide';

/**
 * Phase 66 F — the product-guide spotlight overlay. The story renders the anchor
 * targets + kicks off a two-step guide via the store; the `play` fn asserts the
 * first step card renders. (Positioning uses real layout; interaction/skip paths
 * are exercised in `guide-overlay.test.tsx`.)
 */
function Harness() {
  useEffect(() => {
    // Guide content lives in the `guide` catalog (Phase 82 D), keyed by id +
    // anchor — so the harness borrows the real board guide's first/last steps.
    useGuide.getState().start({
      id: 'board',
      version: 1,
      steps: [{ anchor: 'board' }, { anchor: 'assistant' }],
    });
    return () => useGuide.getState().stop();
  }, []);
  return (
    <div style={{ position: 'relative', height: 300 }}>
      <div data-tour="board" style={{ margin: 40, padding: 24, border: '1px solid #8884', borderRadius: 8, width: 220 }}>
        Board
      </div>
      <button data-tour="assistant" style={{ position: 'absolute', right: 16, bottom: 16 }}>
        Assistant
      </button>
      <GuideOverlay />
    </div>
  );
}

const meta = {
  title: 'Guide/GuideOverlay',
  component: Harness,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
  play: async () => {
    // The overlay portals to document.body, so query the whole document.
    const body = within(document.body);
    await expect(await body.findByText('Your board')).toBeInTheDocument();
    await expect(body.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  },
};

/**
 * Phase 67 B/E — an `advanceOn: 'click'` step. The spotlight hole is click-through,
 * so clicking the real anchored element both runs the app's handler and advances
 * the tour. The `play` fn clicks the anchor and asserts the next step appears.
 */
function InteractiveHarness() {
  useEffect(() => {
    // The real search guide's interactive step, resolved from the catalog.
    useGuide.getState().start({
      id: 'search',
      version: 1,
      steps: [{ anchor: 'search-input', advanceOn: 'click' }, { anchor: 'assistant' }],
    });
    return () => useGuide.getState().stop();
  }, []);
  return (
    <div style={{ position: 'relative', height: 300 }}>
      <input
        data-tour="search-input"
        aria-label="Search"
        placeholder="Search"
        style={{ margin: 40, padding: 8, border: '1px solid #8884', borderRadius: 8, width: 220 }}
      />
      <button data-tour="assistant" style={{ position: 'absolute', right: 16, bottom: 16 }}>
        Assistant
      </button>
      <GuideOverlay />
    </div>
  );
}

export const InteractiveAdvance: StoryObj<typeof meta> = {
  render: () => <InteractiveHarness />,
  play: async () => {
    const body = within(document.body);
    await expect(await body.findByText('Try it')).toBeInTheDocument();
    // Clicking the real anchored element (through the click-through hole) advances.
    await userEvent.click(body.getByLabelText('Search'));
    await expect(await body.findByText('Replay anytime')).toBeInTheDocument();
  },
};
