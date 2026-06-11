import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProjectTag } from './project-tag';

const meta = {
  title: 'Components/ProjectTag',
  component: ProjectTag,
  argTypes: {
    color: { control: 'color' },
  },
} satisfies Meta<typeof ProjectTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DarkFill: Story = { args: { tag: 'WEB', color: '#7c3aed' } };

/** Light fills flip the text to dark via `readableTextColor`. */
export const LightFill: Story = { args: { tag: 'DOCS', color: '#facc15' } };

export const LongTag: Story = {
  args: { tag: 'TWELVECHARSX', color: '#0ea5e9', className: 'max-w-[80px]' },
};

export const Palette: Story = {
  args: { tag: 'WEB', color: '#7c3aed' },
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <ProjectTag tag="WEB" color="#7c3aed" />
      <ProjectTag tag="GATEWAY" color="#0ea5e9" />
      <ProjectTag tag="DOCS" color="#facc15" />
      <ProjectTag tag="OPS" color="#16a34a" />
      <ProjectTag tag="SCRATCH" color="#f1f5f9" />
      <ProjectTag tag="CORE" color="#0f172a" />
    </div>
  ),
};
