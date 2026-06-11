import { AGENT_CLIS, AGENT_CLI_LABEL } from '@midnite/shared';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AgentCliLogo } from './agent-cli-logo';

const meta = {
  title: 'Components/AgentCliLogo',
  component: AgentCliLogo,
  argTypes: {
    cli: { control: 'select', options: [...AGENT_CLIS] },
  },
} satisfies Meta<typeof AgentCliLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Claude: Story = { args: { cli: 'claude', className: 'h-8 w-8' } };
export const Gemini: Story = { args: { cli: 'gemini', className: 'h-8 w-8' } };
export const Codex: Story = { args: { cli: 'codex', className: 'h-8 w-8' } };
export const Aider: Story = { args: { cli: 'aider', className: 'h-8 w-8' } };
export const OpenCode: Story = { args: { cli: 'opencode', className: 'h-8 w-8' } };

export const AllAgents: Story = {
  args: { cli: 'claude' },
  render: () => (
    <div className="flex items-end gap-6">
      {AGENT_CLIS.map((cli) => (
        <div key={cli} className="flex flex-col items-center gap-2">
          <AgentCliLogo cli={cli} className="h-8 w-8" />
          <span className="text-xs text-muted-foreground">{AGENT_CLI_LABEL[cli]}</span>
        </div>
      ))}
    </div>
  ),
};
