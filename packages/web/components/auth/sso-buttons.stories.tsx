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

/** Only GitHub configured — renders a single button. */
export const SingleProvider: Story = {
  beforeEach: () => installMockFetch([{ match: '/auth/sso/providers', json: { providers: ['github'] } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Continue with GitHub')).toBeInTheDocument();
    await expect(canvas.queryByText('Continue with Google')).toBeNull();
  },
};

/** SSO not configured — renders nothing (password-only login is unaffected). */
export const NotConfigured: Story = {
  beforeEach: () => installMockFetch([{ match: '/auth/sso/providers', json: { providers: [] } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Continue with Google')).toBeNull();
    await expect(canvas.queryByText('Continue with GitHub')).toBeNull();
  },
};
