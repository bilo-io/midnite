import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';
import { expect, within } from 'storybook/test';

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
    useGuide.getState().start({
      id: 'demo',
      label: 'Demo tour',
      steps: [
        { anchor: 'demo-board', title: 'Your board', body: 'Tasks flow **left → right** through the columns.' },
        { anchor: 'demo-fab', title: 'Replay anytime', body: 'Reopen this from the assistant menu.' },
      ],
    });
    return () => useGuide.getState().stop();
  }, []);
  return (
    <div style={{ position: 'relative', height: 300 }}>
      <div data-tour="demo-board" style={{ margin: 40, padding: 24, border: '1px solid #8884', borderRadius: 8, width: 220 }}>
        Board
      </div>
      <button data-tour="demo-fab" style={{ position: 'absolute', right: 16, bottom: 16 }}>
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
