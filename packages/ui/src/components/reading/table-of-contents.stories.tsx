import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Prose, proseComponents } from './prose';
import { ReadingLayout } from './reading-layout';
import { TableOfContents } from './table-of-contents';

const { h2: H2, h3: H3, p: P } = proseComponents;

const meta = {
  title: 'Reading/TableOfContents',
  component: TableOfContents,
} satisfies Meta<typeof TableOfContents>;

export default meta;
type Story = StoryObj<typeof meta>;

function Article({ sections }: { sections: [string, string[]][] }) {
  return (
    <Prose>
      {sections.map(([heading, subs]) => (
        <div key={heading}>
          <H2>{heading}</H2>
          <P>Body copy for the {heading.toLowerCase()} section.</P>
          {subs.map((sub) => (
            <div key={sub}>
              <H3>{sub}</H3>
              <P>Detail under {sub.toLowerCase()}.</P>
            </div>
          ))}
        </div>
      ))}
    </Prose>
  );
}

const SECTIONS: [string, string[]][] = [
  ['Install', ['Peer dependencies']],
  ['Usage', []],
  ['Troubleshooting', []],
];

/**
 * The rail finds the article on its own: `ReadingLayout` marks it, so the common
 * case needs no ref wiring. Entries are indented by heading level.
 */
export const InReadingLayout: Story = {
  render: () => (
    <ReadingLayout toc={<TableOfContents />}>
      <Article sections={SECTIONS} />
    </ReadingLayout>
  ),
};

/**
 * The active section is highlighted for assistive tech via `aria-current`. On
 * mount the first section is active; clicking an entry moves the highlight and
 * scrolls to that heading.
 *
 * The click path is asserted rather than a scrolled one: `IntersectionObserver`
 * callbacks depend on scroll physics and canvas height, which is exactly the kind
 * of timing dependency that makes a browser test flaky. The scroll-spy wiring
 * itself (observe on mount, disconnect on unmount) is covered by the jsdom specs.
 *
 * The rail renders outside the layout's `toc` slot here so the assertions don't
 * hinge on the canvas being wider than `xl` — that slot is deliberately hidden
 * below it, and `reading-layout.dom.test.tsx` already pins the gate. The rail
 * still finds the article by itself, via the marker `ReadingLayout` stamps on it.
 */
export const ActiveSection: Story = {
  render: () => (
    <>
      <ReadingLayout>
        <Article sections={SECTIONS} />
      </ReadingLayout>
      <TableOfContents />
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rail = canvas.getByRole('navigation', { name: 'On this page' });
    const railScope = within(rail);

    const install = railScope.getByRole('button', { name: 'Install' });
    const usage = railScope.getByRole('button', { name: 'Usage' });

    // First section is active until the reader moves.
    await expect(install).toHaveAttribute('aria-current', 'location');
    await expect(usage).not.toHaveAttribute('aria-current');

    await userEvent.click(usage);

    await expect(usage).toHaveAttribute('aria-current', 'location');
    await expect(install).not.toHaveAttribute('aria-current');
  },
};

/** A single-section page doesn't earn a rail, so nothing renders. */
export const SuppressedBelowTwoHeadings: Story = {
  render: () => (
    <ReadingLayout toc={<TableOfContents />}>
      <Article sections={[['Only section', []]]} />
    </ReadingLayout>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('navigation', { name: 'On this page' })).toBeNull();
  },
};
