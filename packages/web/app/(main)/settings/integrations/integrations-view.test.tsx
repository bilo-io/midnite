import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Webhook } from '@midnite/shared';

const listWebhooks = vi.fn();
const createWebhook = vi.fn();
const deleteWebhook = vi.fn();
const rotateWebhookSecret = vi.fn();
const updateWebhook = vi.fn();
const listWebhookDeliveries = vi.fn();
const sendWebhookTest = vi.fn();
const redeliverWebhook = vi.fn();
vi.mock('@/lib/api', () => ({
  listWebhooks: () => listWebhooks(),
  createWebhook: (b: unknown) => createWebhook(b),
  deleteWebhook: (id: string) => deleteWebhook(id),
  rotateWebhookSecret: (id: string) => rotateWebhookSecret(id),
  updateWebhook: (id: string, b: unknown) => updateWebhook(id, b),
  listWebhookDeliveries: (id: string) => listWebhookDeliveries(id),
  sendWebhookTest: (id: string) => sendWebhookTest(id),
  redeliverWebhook: (id: string, d: string) => redeliverWebhook(id, d),
  // Phase 46: the view now embeds <InboundSourcesSection/>, which fetches on mount.
  // Stub the inbound surface so these outbound-focused tests render cleanly.
  listInboundSources: () => Promise.resolve({ sources: [] }),
  gatewayUrl: () => 'http://gw.test',
}));

import { IntegrationsView } from './integrations-view';

const HOOK: Webhook = {
  id: 'w1',
  teamId: 'team-1',
  createdBy: 'u1',
  url: 'https://hooks.slack.com/services/abc',
  provider: 'slack',
  eventFilter: { events: ['task.updated'], statuses: ['done'] },
  enabled: true,
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
};

const DELIVERY = {
  id: 'd1',
  webhookId: 'w1',
  event: 'task.updated' as const,
  status: 'success' as const,
  responseCode: 200,
  attempts: 1,
  error: null,
  payload: '{}',
  createdAt: '2026-06-30T01:00:00.000Z',
};

beforeEach(() => {
  listWebhooks.mockReset();
  createWebhook.mockReset();
  listWebhookDeliveries.mockReset();
  sendWebhookTest.mockReset();
  redeliverWebhook.mockReset();
});

describe('IntegrationsView', () => {
  it('shows the empty state when there are no endpoints', async () => {
    listWebhooks.mockResolvedValue({ webhooks: [] });
    render(<IntegrationsView />);
    expect(await screen.findByText(/No webhook endpoints yet/)).toBeInTheDocument();
  });

  it('lists endpoints with provider, host and events', async () => {
    listWebhooks.mockResolvedValue({ webhooks: [HOOK] });
    render(<IntegrationsView />);
    expect(await screen.findByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('hooks.slack.com')).toBeInTheDocument();
    expect(screen.getByText('updated → done')).toBeInTheDocument();
  });

  it('creates an endpoint and reveals the signing secret once', async () => {
    listWebhooks.mockResolvedValue({ webhooks: [] });
    createWebhook.mockResolvedValue({ webhook: HOOK, secret: 'whsec_topsecret' });
    render(<IntegrationsView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Add endpoint' }));
    fireEvent.change(screen.getByPlaceholderText(/hooks.slack.com/i), {
      target: { value: 'https://hooks.slack.com/services/abc' },
    });
    // 'task.updated' is selected by default. Both the header and the modal expose
    // an "Add endpoint" button — the modal's is the last one rendered.
    const addButtons = screen.getAllByRole('button', { name: 'Add endpoint' });
    fireEvent.click(addButtons[addButtons.length - 1]!);

    await waitFor(() => expect(createWebhook).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('whsec_topsecret')).toBeInTheDocument();
    expect(screen.getByText(/will not be shown again/)).toBeInTheDocument();
  });

  it('expands the deliveries log and lists recorded attempts', async () => {
    listWebhooks.mockResolvedValue({ webhooks: [HOOK] });
    listWebhookDeliveries.mockResolvedValue({ deliveries: [DELIVERY] });
    render(<IntegrationsView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Deliveries' }));
    await waitFor(() => expect(listWebhookDeliveries).toHaveBeenCalledWith('w1'));
    expect(await screen.findByText('success')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redeliver' })).toBeInTheDocument();
  });

  it('sends a test event and surfaces the result', async () => {
    listWebhooks.mockResolvedValue({ webhooks: [HOOK] });
    sendWebhookTest.mockResolvedValue({ delivery: DELIVERY });
    listWebhookDeliveries.mockResolvedValue({ deliveries: [DELIVERY] });
    render(<IntegrationsView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Send test' }));
    await waitFor(() => expect(sendWebhookTest).toHaveBeenCalledWith('w1'));
    expect(await screen.findByText('✓ test sent')).toBeInTheDocument();
  });
});
