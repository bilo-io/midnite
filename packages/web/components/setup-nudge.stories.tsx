import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { SetupStatus } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { SetupNudge } from './setup-nudge';

// A fresh-ish install: no provider key, no secret key (the two blockers), the
// CLI present, pool + repo only recommended.
const NOT_READY: SetupStatus = {
  ready: false,
  items: [
    { id: 'provider', label: 'LLM provider', state: 'missing', detail: 'No provider has an API key.' },
    { id: 'secret-key', label: 'Secret key', state: 'missing', detail: 'MIDNITE_SECRET_KEY not set.' },
    { id: 'agent-cli', label: 'Agent CLI', state: 'ok', detail: 'claude 1.2.3 on PATH' },
    { id: 'agent-pool', label: 'Agent pool', state: 'warn', detail: 'Autonomous scheduling off.' },
    { id: 'repo', label: 'Repository', state: 'warn', detail: 'No repos registered yet (optional).' },
  ],
};

// Everything required is satisfied; only the recommended steps remain.
const ALMOST: SetupStatus = {
  ready: false,
  items: [
    { id: 'provider', label: 'LLM provider', state: 'ok', detail: 'anthropic ready' },
    { id: 'secret-key', label: 'Secret key', state: 'ok', detail: 'MIDNITE_SECRET_KEY set' },
    { id: 'agent-cli', label: 'Agent CLI', state: 'ok', detail: 'claude 1.2.3 on PATH' },
    { id: 'agent-pool', label: 'Agent pool', state: 'warn', detail: 'Autonomous scheduling off.' },
    { id: 'repo', label: 'Repository', state: 'warn', detail: 'No repos registered yet (optional).' },
  ],
};

const READY: SetupStatus = {
  ready: true,
  items: ALMOST.items.map((i) => ({ ...i, state: 'ok' as const })),
};

const meta = {
  title: 'Components/SetupNudge',
  component: SetupNudge,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="relative h-96 w-full bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SetupNudge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two required steps outstanding → the soft nudge with a primary CTA. */
export const NotReady: Story = {
  beforeEach: () => installMockFetch([{ match: '/setup/status', json: NOT_READY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('region', { name: /finish setting up midnite/i });
    await expect(canvas.getByText('2 steps left before agents can run.')).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: /set up llm provider/i })).toHaveAttribute(
      'href',
      '/settings/agents',
    );
  },
};

/** Required steps done, recommendations remain → softer copy. */
export const AlmostReady: Story = {
  beforeEach: () => installMockFetch([{ match: '/setup/status', json: ALMOST }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('region', { name: /finish setting up midnite/i });
    await expect(canvas.getByText('A couple of recommended steps remain.')).toBeInTheDocument();
  },
};

/** Fully ready → the nudge stays out of the way entirely. */
export const Ready: Story = {
  beforeEach: () => installMockFetch([{ match: '/setup/status', json: READY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Give the fetch a tick, then assert the nudge never mounts.
    await new Promise((r) => setTimeout(r, 50));
    await expect(canvas.queryByRole('region', { name: /finish setting up/i })).toBeNull();
  },
};
