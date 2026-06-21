import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Memory } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { MemoriesWidget } from './memories-widget';

const MEMORIES: Memory[] = [
  {
    id: 'm1',
    title: 'Use worktrees for parallel work',
    content: 'Default to a dedicated git worktree per feature branch.',
    projectId: null,
    sources: [],
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-21T09:00:00.000Z',
  },
  {
    id: 'm2',
    title: 'Web tests fail in .git worktrees',
    content: 'Vite denies `.git/**`, so run web tests from the primary checkout.',
    projectId: 'p-midnite',
    sources: [],
    createdAt: '2026-06-02T09:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z',
  },
];

const meta = {
  title: 'Widgets/MemoriesWidget',
  component: MemoriesWidget,
  decorators: [
    (Story) => (
      <div className="h-80 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MemoriesWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

// `getMemories` unwraps `{ memories }`, so the handler returns the envelope.
const memoriesOk = [{ match: '/memories', json: { memories: MEMORIES } }];

/** Recent memories loaded from the gateway, global + project scoped. */
export const Default: Story = {
  beforeEach: () => installMockFetch(memoriesOk),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(MEMORIES[0]!.title)).toBeInTheDocument();
    // Scope badges render from the projectId discriminator.
    await expect(canvas.getByText('Global')).toBeInTheDocument();
    await expect(canvas.getByText('Project')).toBeInTheDocument();
  },
};

/** No memories yet → the empty-state message. */
export const Empty: Story = {
  beforeEach: () => installMockFetch([{ match: '/memories', json: { memories: [] } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No memories yet.')).toBeInTheDocument();
  },
};

/** Gateway memories endpoint fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/memories', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load memories.')).toBeInTheDocument();
  },
};
