import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { SetupStatus } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { SetupStatusPanel } from '@/app/(main)/settings/system/setup-status-panel';

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

const READY: SetupStatus = {
  ready: true,
  items: [
    { id: 'provider', label: 'LLM provider', state: 'ok', detail: 'anthropic ready' },
    { id: 'secret-key', label: 'Secret key', state: 'ok', detail: 'MIDNITE_SECRET_KEY set' },
    { id: 'agent-cli', label: 'Agent CLI', state: 'ok', detail: 'claude 1.2.3 on PATH' },
    { id: 'agent-pool', label: 'Agent pool', state: 'ok', detail: '4 slots, autonomous scheduling on' },
    { id: 'repo', label: 'Repository', state: 'ok', detail: '1 registered' },
  ],
};

const meta = {
  title: 'Components/SetupStatusPanel',
  component: SetupStatusPanel,
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SetupStatusPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Setup incomplete — blockers + recommendations, each deep-linked. */
export const NotReady: Story = {
  beforeEach: () => installMockFetch([{ match: '/setup/status', json: NOT_READY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Setup incomplete')).toBeInTheDocument();
    await expect(canvas.getAllByRole('link', { name: /fix/i }).length).toBeGreaterThan(0);
    await expect(canvas.getByRole('link', { name: /manage/i })).toBeInTheDocument();
  },
};

/** Fully set up. */
export const Ready: Story = {
  beforeEach: () => installMockFetch([{ match: '/setup/status', json: READY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Ready')).toBeInTheDocument();
  },
};

/** Gateway unreachable → an inline retry. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/setup/status', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/couldn.t load setup status/i)).toBeInTheDocument();
  },
};
