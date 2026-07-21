import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { installMockFetch } from '@/stories/mock-fetch';
import { SsoButtons } from './sso-buttons';

const meta: Meta<typeof SsoButtons> = {
  title: 'Auth/SsoButtons',
  component: SsoButtons,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof SsoButtons>;

/** Both providers configured — the login/register button row. */
export const BothProviders: Story = {
  args: { redirect: '/board' },
  beforeEach: () => installMockFetch([{ match: '/auth/sso/providers', json: { providers: ['google', 'github'] } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Continue with Google')).toBeInTheDocument();
    await expect(canvas.getByText('Continue with GitHub')).toBeInTheDocument();
    await expect(canvas.getByTestId('sso-google')).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/sso/google/start'),
    );
  },
};

/** Only GitHub configured — both buttons still show (SSO stays fully visible by
 *  design; an unconfigured click gets a friendly error rather than a hidden button). */
export const SingleProvider: Story = {
  beforeEach: () => installMockFetch([{ match: '/auth/sso/providers', json: { providers: ['github'] } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Continue with GitHub')).toBeInTheDocument();
    await expect(canvas.getByText('Continue with Google')).toBeInTheDocument();
  },
};

/** Gateway reports no configured providers — the buttons still show (fallback to
 *  both) so SSO stays visible; an unconfigured click gets a friendly error. */
export const UnconfiguredFallback: Story = {
  beforeEach: () => installMockFetch([{ match: '/auth/sso/providers', json: { providers: [] } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Continue with Google')).toBeInTheDocument();
    await expect(canvas.getByText('Continue with GitHub')).toBeInTheDocument();
  },
};
