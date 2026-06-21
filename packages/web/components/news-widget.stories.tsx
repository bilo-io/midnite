import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { HackerNewsStory } from '@midnite/shared';
import { expect, fn, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { NewsWidget } from './news-widget';

const STORIES: HackerNewsStory[] = [
  { id: 1, title: 'Show HN: a multitask orchestrator for Claude Code', url: 'https://example.com/midnite', score: 412, by: 'ada', comments: 87, time: 1_718_000_000 },
  { id: 2, title: 'The unreasonable effectiveness of SQLite', url: 'https://example.com/sqlite', score: 298, by: 'grace', comments: 54, time: 1_717_900_000 },
  { id: 3, title: 'Ask HN: how do you test data-fetching components?', score: 156, by: 'linus', comments: 132, time: 1_717_800_000 },
  { id: 4, title: 'A field guide to Vitest browser mode', url: 'https://example.com/vitest', score: 88, by: 'margaret', comments: 12, time: 1_717_700_000 },
  { id: 5, title: 'Why your kanban board should be a state machine', url: 'https://example.com/kanban', score: 61, by: 'edsger', comments: 9, time: 1_717_600_000 },
];

const meta = {
  title: 'Widgets/NewsWidget',
  component: NewsWidget,
  args: { config: { count: 5, layout: 'list' }, onConfigChange: fn() },
  decorators: [
    (Story) => (
      <div className="h-96 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NewsWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

const newsOk = [{ match: '/news', json: { stories: STORIES } }];

/** Stories loaded from the gateway proxy, list layout. */
export const List: Story = {
  beforeEach: () => installMockFetch(newsOk),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(STORIES[0]!.title)).toBeInTheDocument();
  },
};

/** Two-column grid layout. */
export const Grid: Story = {
  args: { config: { count: 5, layout: 'grid' }, onConfigChange: fn() },
  beforeEach: () => installMockFetch(newsOk),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(STORIES[1]!.title)).toBeInTheDocument();
  },
};

/** Gateway proxy fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/news', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load stories.')).toBeInTheDocument();
  },
};
