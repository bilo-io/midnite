import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import {
  projectTagInfo,
  sessionCompleted,
  sessionIdle,
  sessionRunning,
  sessionWaiting,
  sessions,
} from '@/stories/fixtures';

import { SessionCard, SessionRow, SessionStatusDot } from './session-card';

const meta = {
  title: 'Components/SessionCard',
  component: SessionCard,
  args: { onClick: fn() },
} satisfies Meta<typeof SessionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Running sessions pulse their status dot. */
export const Running: Story = {
  args: { session: sessionRunning, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};

export const Waiting: Story = {
  args: { session: sessionWaiting, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};

export const ListLayout: Story = {
  args: { session: sessionCompleted, layout: 'list' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

/** Idle, no context ring (no token counts reported). */
export const Idle: Story = {
  args: { session: sessionIdle, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};

/** The flat table-row variant used inside the Sessions accordions. */
export const Rows: Story = {
  args: { session: sessionRunning, layout: 'list' },
  render: () => (
    <div className="max-w-3xl rounded-lg border border-border/60">
      {sessions.map((s) => (
        <SessionRow key={s.id} session={s} project={projectTagInfo} onClick={fn()} />
      ))}
    </div>
  ),
};

export const StatusDots: Story = {
  args: { session: sessionRunning, layout: 'grid' },
  render: () => (
    <div className="flex items-center gap-6">
      {(['running', 'waiting', 'completed', 'idle'] as const).map((status) => (
        <div key={status} className="flex items-center gap-2">
          <SessionStatusDot status={status} />
          <span className="text-xs text-muted-foreground">{status}</span>
        </div>
      ))}
    </div>
  ),
};
