import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { SessionSummary } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { SessionsWidget } from './sessions-widget';

const SESSIONS: SessionSummary[] = [
  {
    id: 's1',
    projectSlug: 'midnite',
    projectDisplay: 'midnite',
    title: 'Wire up the scheduler tick metric',
    subtitle: 'feature/scheduler-metric',
    status: 'running',
    lastActivity: 1_718_000_000_000,
    contextTokens: 42_000,
    contextLimit: 200_000,
  },
  {
    id: 's2',
    projectSlug: 'midnite',
    projectDisplay: 'midnite',
    title: 'Review the repo registry migration',
    subtitle: 'feature/repo-registry',
    status: 'waiting',
    lastActivity: 1_717_900_000_000,
  },
  {
    id: 's3',
    projectSlug: 'docs',
    projectDisplay: 'docs-app',
    title: 'Draft the Phase 26 plan',
    subtitle: 'docs/phase-26',
    status: 'completed',
    lastActivity: 1_717_800_000_000,
  },
];

const meta = {
  title: 'Widgets/SessionsWidget',
  component: SessionsWidget,
  decorators: [
    (Story) => (
      <div className="h-80 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SessionsWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Live sessions loaded from the gateway, ordered by liveness. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/sessions', json: SESSIONS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(SESSIONS[0]!.title)).toBeInTheDocument();
    await expect(canvas.getByText(SESSIONS[1]!.title)).toBeInTheDocument();
  },
};

/** No active sessions → the empty-state message. */
export const Empty: Story = {
  beforeEach: () => installMockFetch([{ match: '/sessions', json: [] }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No active sessions.')).toBeInTheDocument();
  },
};

/** Gateway sessions endpoint fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/sessions', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load sessions.')).toBeInTheDocument();
  },
};
