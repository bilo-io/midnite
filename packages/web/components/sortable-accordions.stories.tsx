import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { SortableAccordions, type AccordionSection } from './sortable-accordions';
import { ProjectTag } from './project-tag';

const meta = {
  title: 'Components/SortableAccordions',
  component: SortableAccordions,
  parameters: { layout: 'padded' },
  // Section order + collapsed state persist to localStorage; clear it so the
  // collapse story can't leak into a later one.
  beforeEach: () => {
    try {
      localStorage.removeItem('midnite.stories.accordions.order');
      localStorage.removeItem('midnite.stories.accordions.collapsed');
    } catch {
      // ignore unavailable storage
    }
  },
} satisfies Meta<typeof SortableAccordions>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The shape that used to trip axe's `nested-interactive`: a heading carrying a
 * **link** and trailing **actions**, inside a header that toggles on click. The
 * disclosure control is now a button holding only the chevron, so none of those
 * live inside a widget. The addon's a11y check is the real assertion here.
 */
const linkedSections: AccordionSection[] = [
  {
    id: 'alpha',
    label: (
      // A real, focusable link — the thing that used to nest inside the header's
      // widget. Fragment href so it can't navigate the test runner.
      <a href="#alpha" onClick={(e) => e.stopPropagation()} className="hover:underline">
        Alpha project
      </a>
    ),
    color: '#60a5fa',
    count: 3,
    summary: '3 tasks',
    progress: { done: 1, total: 3 },
    actions: <ProjectTag tag="ALP" color="#60a5fa" />,
    body: <p className="p-3 text-sm text-muted-foreground">Alpha’s tasks live here.</p>,
  },
  {
    id: 'beta',
    label: (
      <a href="#beta" onClick={(e) => e.stopPropagation()} className="hover:underline">
        Beta project
      </a>
    ),
    color: '#34d399',
    count: 1,
    summary: '1 task',
    body: <p className="p-3 text-sm text-muted-foreground">Beta’s tasks live here.</p>,
  },
];

/** A heading link + trailing actions, with no interactive nesting. */
export const LinkedHeadings: Story = {
  args: { sections: linkedSections, storageKey: 'midnite.stories.accordions', variant: 'split' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The toggle is named by its heading and reports expanded state…
    const toggle = canvas.getByRole('button', { name: /Alpha project/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // …and it does not contain the heading's link (that would nest a control).
    await expect(toggle.querySelector('a')).toBeNull();
    // The link is still reachable in its own right.
    await expect(canvas.getByRole('link', { name: 'Alpha project' })).toBeInTheDocument();
  },
};

/** The toggle button collapses its own section and leaves siblings alone. */
export const CollapseViaToggleButton: Story = {
  args: { sections: linkedSections, storageKey: 'midnite.stories.accordions', variant: 'split' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Alpha project/ }));
    await waitFor(async () => {
      await expect(canvas.getByRole('button', { name: /Alpha project/ })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
    await expect(canvas.getByRole('button', { name: /Beta project/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
};

/** Clicking the header row (not the button) still toggles — the mouse convenience
 *  that survived demoting the row from `role="button"` to a plain surface. */
export const CollapseViaHeaderRow: Story = {
  args: { sections: linkedSections, storageKey: 'midnite.stories.accordions', variant: 'split' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The count pill sits in the click surface, away from the link and the button.
    await userEvent.click(canvas.getByText('3 tasks'));
    await waitFor(async () => {
      await expect(canvas.getByRole('button', { name: /Alpha project/ })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  },
};
