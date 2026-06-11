import { SOURCE_KINDS } from '@midnite/shared';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SourceIcon } from './source-icon';

const meta = {
  title: 'Components/SourceIcon',
  component: SourceIcon,
  argTypes: {
    kind: { control: 'select', options: [...SOURCE_KINDS] },
  },
} satisfies Meta<typeof SourceIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Github: Story = { args: { kind: 'github', className: 'h-6 w-6' } };
export const Figma: Story = { args: { kind: 'figma', className: 'h-6 w-6' } };
export const GoogleDocs: Story = { args: { kind: 'google-docs', className: 'h-6 w-6' } };
export const GenericLink: Story = { args: { kind: 'link', className: 'h-6 w-6' } };

/** Every detected provider kind with its brand mark or lucide fallback. */
export const AllKinds: Story = {
  args: { kind: 'github' },
  render: () => (
    <div className="grid grid-cols-5 gap-x-6 gap-y-4">
      {SOURCE_KINDS.map((kind) => (
        <div key={kind} className="flex items-center gap-2">
          <SourceIcon kind={kind} className="h-5 w-5" />
          <span className="text-xs text-muted-foreground">{kind}</span>
        </div>
      ))}
    </div>
  ),
};
