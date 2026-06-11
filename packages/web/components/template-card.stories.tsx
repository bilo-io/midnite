import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { TEMPLATES } from '@/app/(main)/projects/templates';

import { TemplateCard } from './template-card';

const meta = {
  title: 'Components/TemplateCard',
  component: TemplateCard,
  args: { onOpen: fn() },
} satisfies Meta<typeof TemplateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grid: Story = {
  args: { template: TEMPLATES[0]!, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};

export const List: Story = {
  args: { template: TEMPLATES[1] ?? TEMPLATES[0]!, layout: 'list' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

/** The whole built-in catalog, as the Templates tab lays it out. */
export const Catalog: Story = {
  args: { template: TEMPLATES[0]!, layout: 'grid' },
  render: () => (
    <div className="grid max-w-4xl grid-cols-3 gap-3">
      {TEMPLATES.map((t) => (
        <TemplateCard key={t.id} template={t} layout="grid" onOpen={fn()} />
      ))}
    </div>
  ),
};
