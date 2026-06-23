import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { AgentPingResponse, AgentsConfig } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { AgentsWidget } from './agents-widget';

const CONFIG: AgentsConfig = {
  cli: 'claude',
  primary: {
    name: 'Orchestrator',
    description: 'The single orchestrator agent.',
    heartbeatEnabled: true,
    heartbeatPrompt: 'Check the board and pick up ready work.',
    heartbeatIntervalH: 6,
    lastHeartbeatAt: '2026-06-23T08:00:00.000Z',
    updatedAt: '2026-06-23T08:00:00.000Z',
  },
  subAgents: [
    {
      id: 'sa1',
      name: 'Reviewer',
      role: 'Code review',
      description: 'Reviews diffs before merge.',
      createdAt: '2026-06-20T09:00:00.000Z',
      updatedAt: '2026-06-20T09:00:00.000Z',
    },
  ],
};

const PING: AgentPingResponse = {
  ok: true,
  cli: 'claude',
  model: 'claude-opus-4-8',
  reply: 'pong',
};

const meta = {
  title: 'Widgets/AgentsWidget',
  component: AgentsWidget,
  decorators: [
    (Story) => (
      <div className="h-80 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AgentsWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

// `/agents/ping` is listed before `/agents` — first match wins, so the broader
// path can't swallow the ping request.
const PING_OK = { match: '/agents/ping', json: PING } as const;

/** Config + a healthy ping loaded from the gateway. */
export const Default: Story = {
  beforeEach: () => installMockFetch([PING_OK, { match: '/agents', json: { config: CONFIG } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Orchestrator')).toBeInTheDocument();
    await expect(canvas.getByText('Reviewer')).toBeInTheDocument();
    await expect(canvas.getByText(/Heartbeat every 6h/)).toBeInTheDocument();
  },
};

/** No sub-agents and heartbeat off → the inert-state copy. */
export const NoSubAgents: Story = {
  beforeEach: () =>
    installMockFetch([
      PING_OK,
      {
        match: '/agents',
        json: {
          config: {
            ...CONFIG,
            primary: { ...CONFIG.primary, heartbeatEnabled: false },
            subAgents: [],
          },
        },
      },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Heartbeat off')).toBeInTheDocument();
    await expect(canvas.getByText('None configured.')).toBeInTheDocument();
  },
};

/** Gateway `/agents` fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([PING_OK, { match: '/agents', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load agents.')).toBeInTheDocument();
  },
};
