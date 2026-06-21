import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { installMockFetch, type FetchHandler } from '@/stories/mock-fetch';

import { HealthWidget } from './health-widget';

// HealthWidget fans out to three endpoints. `/agents/cli/statuses` is listed
// before `/agents` because matching is first-substring-wins.
const cliStatuses: FetchHandler = {
  match: '/agents/cli/statuses',
  json: {
    statuses: [
      { cli: 'claude', installed: true, version: '1.2.3' },
      { cli: 'gemini', installed: false },
      { cli: 'codex', installed: false },
      { cli: 'opencode', installed: false },
      { cli: 'aider', installed: true, version: '0.5.0' },
    ],
  },
};

const agentsConfig: FetchHandler = {
  match: '/agents',
  json: {
    config: {
      cli: 'claude',
      primary: {
        name: 'Orchestrator',
        description: 'Plans and dispatches work.',
        heartbeatEnabled: false,
        heartbeatPrompt: '',
        heartbeatIntervalH: 24,
        updatedAt: '2026-06-21T09:00:00.000Z',
      },
      subAgents: [],
    },
  },
};

const meta = {
  title: 'Widgets/HealthWidget',
  component: HealthWidget,
  decorators: [
    (Story) => (
      <div className="h-72 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HealthWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Gateway reachable, Claude installed + active, the rest not set up. */
export const Healthy: Story = {
  beforeEach: () =>
    installMockFetch([{ match: '/health', json: { ok: true } }, cliStatuses, agentsConfig]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Reachable')).toBeInTheDocument();
    // The active-CLI badge + a not-installed row both render from the registry.
    await expect(canvas.getByText('active')).toBeInTheDocument();
    await expect(canvas.getAllByText('Not installed').length).toBeGreaterThan(0);
  },
};

/** Gateway probe fails → the Gateway row goes red/Unreachable. */
export const GatewayDown: Story = {
  beforeEach: () =>
    installMockFetch([{ match: '/health', status: 503 }, cliStatuses, agentsConfig]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Unreachable')).toBeInTheDocument();
  },
};
