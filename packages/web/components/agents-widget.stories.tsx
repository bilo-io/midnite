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
    // `tall` stories size the card to fit their content so the body doesn't
    // scroll (a scrolling region is a separate, pre-existing a11y concern).
    (Story, ctx) => (
      <div className={ctx.parameters.tall ? 'h-[600px] w-80' : 'h-80 w-80'}>
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

// Sub-agents whose `role` holds a full sentence — the layout stacks name over role
// (each role clamped to two lines) so long text can't collide with the name.
const LONG_ROLE_CONFIG: AgentsConfig = {
  ...CONFIG,
  subAgents: [
    { id: 'a', name: 'Architect', role: 'Designs the technical approach and turns a goal into a concrete, reviewable implementation plan.', description: '', createdAt: '2026-06-20T09:00:00.000Z', updatedAt: '2026-06-20T09:00:00.000Z' },
    { id: 'b', name: 'Designer', role: 'Owns the UI and UX — layout, component structure, interaction, visual polish, and accessibility.', description: '', createdAt: '2026-06-20T09:00:00.000Z', updatedAt: '2026-06-20T09:00:00.000Z' },
    { id: 'c', name: 'Security', role: 'Audits changes for vulnerabilities, unsafe patterns, secret exposure, and abuse vectors.', description: '', createdAt: '2026-06-20T09:00:00.000Z', updatedAt: '2026-06-20T09:00:00.000Z' },
    { id: 'd', name: 'Reviewer', role: "Reviews diffs for correctness, clarity, and adherence to the project's conventions.", description: '', createdAt: '2026-06-20T09:00:00.000Z', updatedAt: '2026-06-20T09:00:00.000Z' },
    { id: 'e', name: 'Tester', role: 'Writes and runs tests, reproduces bugs, and verifies that changes behave correctly.', description: '', createdAt: '2026-06-20T09:00:00.000Z', updatedAt: '2026-06-20T09:00:00.000Z' },
  ],
};

/** Long, sentence-length roles: name and role stack instead of colliding on one row. */
export const LongRoles: Story = {
  parameters: { tall: true },
  beforeEach: () => installMockFetch([PING_OK, { match: '/agents', json: { config: LONG_ROLE_CONFIG } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Security')).toBeInTheDocument();
    await expect(canvas.getByText(/Audits changes for vulnerabilities/)).toBeInTheDocument();
  },
};
