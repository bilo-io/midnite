import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { project, projectsById, taskFeature, tasks } from '@/stories/fixtures';

import { BoardView } from './board-view';
import { ConfirmProvider } from './confirm-dialog';
import { COLUMNS } from './task-columns';

const meta = {
  title: 'Components/BoardView',
  component: BoardView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    // The board fills its parent's height; give it a viewport-like frame.
    // ConfirmProvider backs the keyboard D/A confirm dialogs (Phase 41 Theme D).
    (Story) => (
      <ConfirmProvider>
        <div className="flex h-[640px] flex-col p-4">
          <Story />
        </div>
      </ConfirmProvider>
    ),
  ],
  args: { onSelect: fn() },
  // Collapsed end columns persist to localStorage; clear it so a collapse story
  // can't leak its state into a later story (e.g. hiding the Done column's cards).
  beforeEach: () => {
    try {
      localStorage.removeItem('midnite.tasks.collapsedColumns');
    } catch {
      // ignore unavailable storage
    }
  },
} satisfies Meta<typeof BoardView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full board: every status column plus the tucked-away Abandoned section. */
export const Populated: Story = {
  args: {
    tasks,
    columns: COLUMNS,
    projectsById,
    showAbandoned: true,
  },
  // Clicking a card (a plain click, not a drag) selects its task.
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(taskFeature.title));
    await expect(args.onSelect).toHaveBeenCalledOnce();
  },
};

/**
 * Keyboard navigation (Phase 41 Theme D): no ring until the first arrow press,
 * then arrows walk the grid and Enter opens the focused card's detail.
 */
export const KeyboardNavigation: Story = {
  args: {
    tasks,
    columns: COLUMNS,
    projectsById,
    showAbandoned: false,
    onSelect: fn(),
  },
  play: async ({ args, canvasElement }) => {
    // Nothing is focused until the user presses an arrow.
    expect(canvasElement.querySelectorAll('[data-focused]')).toHaveLength(0);

    // ArrowDown seeds the focus ring onto exactly one card.
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('[data-focused]')).toHaveLength(1),
    );

    // Enter opens the focused card's detail modal.
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenCalledOnce();
  },
};

/**
 * The Backlog and Done end columns collapse to a slim vertical rail (name +
 * count), reclaiming width for the active middle columns. Collapsing hides the
 * column's cards but keeps it as a drop target; clicking the rail expands it.
 */
export const CollapsibleEndColumns: Story = {
  args: {
    tasks,
    columns: COLUMNS,
    projectsById,
    showAbandoned: false,
    onMove: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Backlog starts expanded — the header exposes a collapse affordance.
    const collapse = await canvas.findByRole('button', { name: 'Collapse Backlog column' });
    await userEvent.click(collapse);
    // Now it's a slim rail whose whole surface expands it back.
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Expand Backlog column' })).toBeInTheDocument(),
    );
  },
};

/**
 * Collapse is a single shared preference — it works the same inside the
 * per-project accordions, where collapsing an end column reclaims width in
 * every project's board at once.
 */
export const CollapseInPerProjectBoards: Story = {
  args: {
    tasks,
    columns: COLUMNS,
    projectsById,
    showAbandoned: false,
    groupByProject: true,
    projects: [project],
    onMove: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Several project groups render, each with its own Done column. Collapse is a
    // single shared preference, so collapsing one collapses Done in *every* group.
    const collapses = await canvas.findAllByRole('button', { name: 'Collapse Done column' });
    await userEvent.click(collapses[0]!);
    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: 'Expand Done column' }).length).toBeGreaterThan(0),
    );
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
    columns: COLUMNS,
    projectsById,
    showAbandoned: false,
  },
};

/** A filtered board: only the WIP and Waiting columns visible. */
export const FilteredColumns: Story = {
  args: {
    tasks,
    columns: COLUMNS.filter((c) => c.status === 'wip' || c.status === 'waiting'),
    projectsById,
    showAbandoned: false,
  },
};

/**
 * Phase 69 E — terminal tasks (done in a column, abandoned in the tucked-away
 * section) expose a hover "Reopen task" affordance; active tasks never do.
 */
export const ReopenAffordance: Story = {
  args: {
    tasks,
    columns: COLUMNS,
    projectsById,
    showAbandoned: true,
    onMove: fn(),
    onReopen: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Done-column cards each expose a (hover-revealed, always-in-DOM) Reopen
    // affordance; the fixtures carry ≥2 done tasks. Active cards never do.
    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: 'Reopen task' }).length).toBeGreaterThanOrEqual(2),
    );
  },
};
