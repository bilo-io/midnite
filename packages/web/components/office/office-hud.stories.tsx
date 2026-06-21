import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { officeAgents } from '@/stories/fixtures';
import { useOfficeStore } from '@/lib/office-store';

import { OfficeHud } from './office-hud';

// The HUD reads everything from the global office store (the Phaser scene and the
// live-data hook drive it in the app). Stories seed that store directly in
// `beforeEach`; the meta-level cleanup resets it so state never leaks between
// stories. We only seed the base overlay — opening a panel (active/board/library)
// is left to the components' own stories so the HUD here stays offline.
const EMPTY = {
  agents: [],
  nearbyId: null,
  nearBoard: false,
  nearKitchen: false,
  nearLibrary: false,
  active: null,
  boardOpen: false,
  libraryOpen: false,
  onBreak: false,
};

const meta = {
  title: 'Office/OfficeHud',
  component: OfficeHud,
  beforeEach: () => () => useOfficeStore.setState(EMPTY),
  decorators: [
    (Story) => (
      <div className="relative h-[480px] w-full overflow-hidden rounded-lg border border-border bg-muted/20">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OfficeHud>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No agents online — the empty office prompt. */
export const Empty: Story = {
  beforeEach: () => {
    useOfficeStore.setState({ ...EMPTY });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('No active agents — start a task to fill the office.'),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/0 agents online/)).toBeInTheDocument();
  },
};

/** Agents at their desks — the online count reflects the roster. */
export const WithAgents: Story = {
  beforeEach: () => {
    useOfficeStore.setState({ ...EMPTY, agents: officeAgents });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/2 agents online/)).toBeInTheDocument();
  },
};

/** Standing at the board room — the interact prompt appears. */
export const NearBoard: Story = {
  beforeEach: () => {
    useOfficeStore.setState({ ...EMPTY, agents: officeAgents, nearBoard: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Board Room')).toBeInTheDocument();
  },
};

/** On a coffee break — the break badge shows top-right. */
export const OnBreak: Story = {
  beforeEach: () => {
    useOfficeStore.setState({ ...EMPTY, agents: officeAgents, onBreak: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('☕ On a break')).toBeInTheDocument();
  },
};
