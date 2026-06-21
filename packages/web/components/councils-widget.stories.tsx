import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Council } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { CouncilsWidget } from './councils-widget';

// `getCouncils` returns `z.array(CouncilSchema)` directly — no envelope.
const COUNCILS: Council[] = [
  {
    id: 'c1',
    name: 'Architecture review',
    synthProvider: 'gemini',
    defaultFormat: 'debate',
    members: [
      {
        id: 'm1',
        councilId: 'c1',
        name: 'Optimist',
        provider: 'claude',
        role: 'Make the strongest case in favour.',
        position: 0,
        createdAt: '2026-06-01T09:00:00.000Z',
        updatedAt: '2026-06-01T09:00:00.000Z',
      },
      {
        id: 'm2',
        councilId: 'c1',
        name: 'Skeptic',
        provider: 'codex',
        role: 'Argue the contrary view.',
        position: 1,
        createdAt: '2026-06-01T09:00:00.000Z',
        updatedAt: '2026-06-01T09:00:00.000Z',
      },
    ],
    consultationCount: 4,
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-21T09:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'Naming bikeshed',
    synthProvider: 'claude',
    defaultFormat: 'brainstorm',
    members: [],
    consultationCount: 0,
    createdAt: '2026-06-02T09:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z',
  },
];

const meta = {
  title: 'Widgets/CouncilsWidget',
  component: CouncilsWidget,
  decorators: [
    (Story) => (
      <div className="h-80 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CouncilsWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Active councils loaded from the gateway, newest first. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/councils', json: COUNCILS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(COUNCILS[0]!.name)).toBeInTheDocument();
    // A member-less council renders the "No members" fallback row.
    await expect(canvas.getByText('No members')).toBeInTheDocument();
  },
};

/** No councils yet → the empty-state message. */
export const Empty: Story = {
  beforeEach: () => installMockFetch([{ match: '/councils', json: [] }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No councils yet.')).toBeInTheDocument();
  },
};

/** Gateway councils endpoint fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/councils', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load councils.')).toBeInTheDocument();
  },
};
