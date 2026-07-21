import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import type { GuardrailSettings } from '@midnite/shared';

import { ConfirmProvider } from './confirm-dialog';
import { GuardrailsBanner, GuardrailsControl } from './guardrails-control';

const running: GuardrailSettings = {
  pausedGlobal: false,
  pausedRepos: [],
  pausedTeams: [],
  pausedBy: null,
  pausedAt: null,
};
const pausedGlobal: GuardrailSettings = { ...running, pausedGlobal: true, pausedBy: 'admin', pausedAt: 'now' };
const pausedRepo: GuardrailSettings = { ...running, pausedRepos: ['acme/api'] };

const meta = {
  title: 'Guardrails/Kill switch',
  decorators: [
    (Story) => (
      <ConfirmProvider>
        <div className="w-[560px] max-w-full">
          <Story />
        </div>
      </ConfirmProvider>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The board's paused banner when scheduling is globally halted. */
export const BannerGlobalPaused: Story = {
  render: () => <GuardrailsBanner guardrails={pausedGlobal} onChange={() => {}} />,
};

/** A scoped (per-repo) pause. */
export const BannerScoped: Story = {
  render: () => <GuardrailsBanner guardrails={pausedRepo} onChange={() => {}} />,
};

/** The compact toolbar control: pause + emergency-stop surfaced directly as
 *  hover-expand buttons (Phase 50 A — no dropdown menu). */
export const ControlMenuOpen: Story = {
  render: () => (
    <div className="flex justify-end p-2">
      <GuardrailsControl guardrails={running} onChange={() => {}} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Both controls are always in the accessible tree (labels are clipped, not
    // removed); hovering just reveals them visually.
    await expect(canvas.getByRole('button', { name: /pause scheduling/i })).toBeInTheDocument();
    await userEvent.hover(canvas.getByRole('button', { name: /emergency stop/i }));
  },
};

/** When already paused, the control collapses to a Resume button. */
export const ControlResume: Story = {
  render: () => (
    <div className="flex justify-end p-2">
      <GuardrailsControl guardrails={pausedGlobal} onChange={() => {}} />
    </div>
  ),
};
