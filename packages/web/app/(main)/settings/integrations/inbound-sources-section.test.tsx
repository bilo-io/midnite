import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { InboundSource } from '@midnite/shared';

afterEach(cleanup);

const listInboundSources = vi.fn();
const createInboundSource = vi.fn();
const deleteInboundSource = vi.fn();
const rotateInboundSecret = vi.fn();
const updateInboundSource = vi.fn();
const listInboundDeliveries = vi.fn();
vi.mock('@/lib/api', () => ({
  listInboundSources: (...a: unknown[]) => listInboundSources(...a),
  createInboundSource: (...a: unknown[]) => createInboundSource(...a),
  deleteInboundSource: (...a: unknown[]) => deleteInboundSource(...a),
  rotateInboundSecret: (...a: unknown[]) => rotateInboundSecret(...a),
  updateInboundSource: (...a: unknown[]) => updateInboundSource(...a),
  listInboundDeliveries: (...a: unknown[]) => listInboundDeliveries(...a),
  gatewayUrl: () => 'http://gw.test',
}));

import { InboundSourcesSection } from './inbound-sources-section';

const source = (over: Partial<InboundSource>): InboundSource => ({
  id: 's1',
  teamId: null,
  createdBy: null,
  provider: 'github',
  eventFilter: { events: ['issues.opened'] },
  defaultRepo: null,
  defaultProjectId: null,
  enabled: true,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('InboundSourcesSection', () => {
  it('shows the empty state when there are no sources', async () => {
    listInboundSources.mockResolvedValue({ sources: [] });
    render(<InboundSourcesSection />);
    expect(await screen.findByText(/No inbound sources yet/)).toBeInTheDocument();
  });

  it('lists a source with its receiver URL and events', async () => {
    listInboundSources.mockResolvedValue({ sources: [source({})] });
    render(<InboundSourcesSection />);
    expect(await screen.findByText('github')).toBeInTheDocument();
    expect(screen.getByText('http://gw.test/integrations/inbound/s1')).toBeInTheDocument();
    expect(screen.getByText('issues.opened')).toBeInTheDocument();
  });

  it('shows "all events" when the filter is empty', async () => {
    listInboundSources.mockResolvedValue({ sources: [source({ eventFilter: { events: [] } })] });
    render(<InboundSourcesSection />);
    expect(await screen.findByText('all events')).toBeInTheDocument();
  });

  it('opens the add modal and creates a source, revealing the secret once', async () => {
    listInboundSources.mockResolvedValue({ sources: [] });
    createInboundSource.mockResolvedValue({ source: source({ id: 'new1' }), secret: 'insec_abc' });
    render(<InboundSourcesSection />);
    await screen.findByText(/No inbound sources yet/);

    fireEvent.click(screen.getByRole('button', { name: 'Add source' }));
    expect(await screen.findByText('Add inbound source')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create source' }));

    // The reveal-once modal shows the secret + the receiver URL.
    expect(await screen.findByText('Source created')).toBeInTheDocument();
    expect(screen.getByDisplayValue('insec_abc')).toBeInTheDocument();
    expect(screen.getByDisplayValue('http://gw.test/integrations/inbound/new1')).toBeInTheDocument();
    await waitFor(() => expect(createInboundSource).toHaveBeenCalled());
  });

  it('expands a source to lazy-load its deliveries log', async () => {
    listInboundSources.mockResolvedValue({ sources: [source({})] });
    listInboundDeliveries.mockResolvedValue({
      deliveries: [
        {
          id: 'd1',
          sourceId: 's1',
          provider: 'github',
          event: 'issues.opened',
          externalId: 'ext-1',
          result: 'created',
          taskId: 't9',
          error: null,
          createdAt: '2026-07-01T00:00:00Z',
        },
      ],
    });
    render(<InboundSourcesSection />);
    await screen.findByText('github');

    // Not fetched until expanded.
    expect(listInboundDeliveries).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Deliveries' }));

    expect(await screen.findByText('created')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'view task' })).toHaveAttribute(
      'href',
      '/tasks/view?id=t9',
    );
    await waitFor(() => expect(listInboundDeliveries).toHaveBeenCalledWith('s1'));
  });
});
