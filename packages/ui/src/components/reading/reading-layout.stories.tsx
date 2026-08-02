import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Prose, proseComponents } from './prose';
import { ReadingLayout } from './reading-layout';
import { TableOfContents } from './table-of-contents';

const { h2: H2, p: P } = proseComponents;

const meta = {
  title: 'Reading/ReadingLayout',
  component: ReadingLayout,
} satisfies Meta<typeof ReadingLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

function SampleNav({ label }: { label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 md:flex-col">
      {['Overview', 'Install', 'Usage'].map((item) => (
        <a
          key={item}
          href={`#${item.toLowerCase()}`}
          className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        >
          {item}
        </a>
      ))}
    </nav>
  );
}

function SampleArticle() {
  return (
    <Prose>
      <H2>Overview</H2>
      <P>
        The reading face is a measured article column with optional navigation either side.
        Docs and the marketing site&apos;s legal pages both render through it.
      </P>
      <H2>Install</H2>
      <P>Slots arrive as props, so the shell stays router-free and renders on the server.</P>
    </Prose>
  );
}

/** Article only — the shell degrades to a plain measured column. */
export const ArticleOnly: Story = {
  args: { children: <SampleArticle /> },
};

/** The docs shape: a sidebar plus the `xl` table-of-contents rail. */
export const WithSidebarAndToc: Story = {
  args: {
    sidebar: <SampleNav label="Docs" />,
    toc: <TableOfContents />,
    children: <SampleArticle />,
  },
};

/**
 * The default `sidebarMobile="hidden"` suits a host that surfaces its nav another
 * way below `md` (docs puts it behind a hamburger drawer), so the column would
 * only duplicate it.
 */
export const SidebarHiddenOnMobile: Story = {
  args: {
    sidebar: <SampleNav label="Docs" />,
    children: <SampleArticle />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const column = canvas.getByRole('navigation', { name: 'Docs' }).parentElement;
    await expect(column).toHaveClass('hidden');
    await expect(column).toHaveClass('md:block');
  },
};

/**
 * `sidebarMobile="inline"` keeps the column visible on a phone — the mode the
 * site's legal pages need, where the sidebar is the *only* route to the other
 * documents and hiding it would strand the reader (Phase 80 C).
 */
export const SidebarInlineOnMobile: Story = {
  args: {
    sidebar: <SampleNav label="Legal" />,
    sidebarMobile: 'inline',
    children: <SampleArticle />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const column = canvas.getByRole('navigation', { name: 'Legal' }).parentElement;
    await expect(column).not.toHaveClass('hidden');
  },
};

/**
 * The host owns the outer shell metrics: the site's legal route passes its own
 * `container`/padding so the migration kept that page's existing rhythm.
 */
export const HostOverriddenShell: Story = {
  args: {
    className: 'max-w-none px-0 py-0',
    articleClassName: 'max-w-2xl',
    children: <SampleArticle />,
  },
};
