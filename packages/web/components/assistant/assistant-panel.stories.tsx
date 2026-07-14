import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { ChatCommandState } from '@/hooks/use-chat-command';

import { AssistantPanel } from './assistant-panel';

/**
 * Phase 67 C/E — the assistant panel's "All guides" index. The story renders the
 * panel straight into its `guides` view; the `play` fn asserts every guide is
 * listed and that fresh storage flags them unseen. Replay navigation + on/off-route
 * behaviour is exercised in `assistant-fab.test.tsx`. `useRouter`/`usePathname`
 * come from the global `nextjs.appDirectory` mock.
 */
const chatStub: ChatCommandState = {
  phase: 'idle',
  preview: null,
  result: null,
  affectedCount: 0,
  error: null,
  busy: false,
  canUndo: false,
  submit: () => {},
  confirm: () => {},
  cancel: () => {},
  undo: () => {},
  reset: () => {},
};

const meta = {
  title: 'Assistant/GuidesIndex',
  component: AssistantPanel,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
  args: {
    view: 'guides' as const,
    onView: () => {},
    onClose: () => {},
    chat: chatStub,
    isMobile: false,
    headingId: 'assistant-heading',
  },
} satisfies Meta<typeof AssistantPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllGuides: Story = {
  play: async () => {
    // The panel portals via GradientGlow into the fullscreen canvas; query body.
    const body = within(document.body);
    // Every shipped guide is listed by label…
    await expect(await body.findByText('Board tour')).toBeInTheDocument();
    await expect(body.getByText('Memory workspace tour')).toBeInTheDocument();
    await expect(body.getByText('Settings tour')).toBeInTheDocument();
    // …and fresh storage flags them unseen.
    await expect(body.getAllByTitle('Not seen yet').length).toBeGreaterThan(0);
  },
};
