import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Prose, proseComponents } from './prose';
import { ReadingLayoutProvider, type ReadingLinkProps } from './reading-provider';

const {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  a: A,
  ul: Ul,
  ol: Ol,
  li: Li,
  blockquote: Blockquote,
  code: Code,
  pre: Pre,
  hr: Hr,
  table: Table,
  th: Th,
  td: Td,
} = proseComponents;

const meta = {
  title: 'Reading/Prose',
  component: Prose,
} satisfies Meta<typeof Prose>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every element the shared map styles, in one place — the reference for reading
 * typography across docs and the site's legal pages. Authored as JSX rather than
 * markdown because `ui` is a leaf and ships no markdown renderer; the real
 * consumers hand this same map to MDX and to react-markdown.
 */
export const AllElements: Story = {
  args: {
    children: (
      <>
        <H1>Reading typography</H1>
        <P>
          One element map, two render paths. Body copy sits at a comfortable measure with
          generous leading, and inline code like <Code>cn()</Code> reads as a chip.
        </P>
        <H2>Headings anchor themselves</H2>
        <P>
          <code>h2</code> and <code>h3</code> derive an <code>id</code> from their text, so
          every consumer gets deep-linkable sections and a table of contents with no
          per-app slug plugin.
        </P>
        <H3>Lists</H3>
        <Ul>
          <Li>Unordered items carry the same leading as body copy.</Li>
          <Li>
            Nested markup — <Code>inline code</Code> and{' '}
            <A href="https://example.com">external links</A> — stays legible.
          </Li>
        </Ul>
        <Ol>
          <Li>Ordered lists share the spacing rhythm.</Li>
          <Li>So a numbered procedure reads as one block.</Li>
        </Ol>
        <H4>Quotes and rules</H4>
        <Blockquote>
          A block quote is set in italics against a left rule, muted so it recedes from the
          main argument.
        </Blockquote>
        <Hr />
        <H3>Code blocks</H3>
        <Pre>
          <Code>{'moon run ui:test\nmoon run docs:test'}</Code>
        </Pre>
        <H3>Tables</H3>
        <Table>
          <thead>
            <tr>
              <Th>Package</Th>
              <Th>Role</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>@midnite/ui</Td>
              <Td>owns the reading face</Td>
            </tr>
            <tr>
              <Td>@midnite/docs</Td>
              <Td>consumes it</Td>
            </tr>
          </tbody>
        </Table>
      </>
    ),
  },
};

/**
 * Headings slugify their own text — including text wrapped in markup, which a
 * shallow read would drop — and repeats are de-duplicated within one `Prose`, so
 * two identically-titled sections still get distinct anchors.
 */
export const SelfSluggingHeadings: Story = {
  args: {
    children: (
      <>
        <H2>Getting Started</H2>
        <H2>
          The <Code>cn()</Code> helper
        </H2>
        <H2>Overview</H2>
        <H3>Overview</H3>
        <H2 id="pinned">A Pinned Section</H2>
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Getting Started' })).toHaveAttribute(
      'id',
      'getting-started',
    );
    // Text inside <code> is part of the slug, not dropped.
    await expect(canvas.getByRole('heading', { name: /helper/ })).toHaveAttribute(
      'id',
      'the-cn-helper',
    );
    // Duplicate titles get suffixed rather than colliding.
    const overviews = canvas.getAllByRole('heading', { name: 'Overview' });
    await expect(overviews[0]).toHaveAttribute('id', 'overview');
    await expect(overviews[1]).toHaveAttribute('id', 'overview-1');
    // An explicit id always wins, so a published anchor survives a retitle.
    await expect(canvas.getByRole('heading', { name: 'A Pinned Section' })).toHaveAttribute(
      'id',
      'pinned',
    );
  },
};

function FakeRouterLink({ href, className, children }: ReadingLinkProps) {
  return (
    <a data-router-link href={`#${href}`} className={className}>
      {children}
    </a>
  );
}

/**
 * Root-relative links render through the host's injected router link, while
 * external ones stay plain anchors that open off-site — so `ui` never imports a
 * router yet in-app links still work under docs' hash router.
 */
export const InjectedLinks: Story = {
  args: {
    children: (
      <P>
        <A href="/app/tasks">An in-app route</A> and{' '}
        <A href="https://example.com">an external link</A>.
      </P>
    ),
  },
  decorators: [
    (Story) => (
      <ReadingLayoutProvider linkComponent={FakeRouterLink}>
        <Story />
      </ReadingLayoutProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const internal = canvas.getByRole('link', { name: 'An in-app route' });
    await expect(internal).toHaveAttribute('data-router-link');
    await expect(internal).toHaveAttribute('href', '#/app/tasks');

    const external = canvas.getByRole('link', { name: 'an external link' });
    await expect(external).not.toHaveAttribute('data-router-link');
    await expect(external).toHaveAttribute('target', '_blank');
  },
};
