import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WebhookDeliveryRow, WebhookRow } from '../db/schema';
import {
  WebhookDeliveryDoesNotExistError,
  WebhookDoesNotExistError,
  WebhooksService,
} from './webhooks.service';

function webhookRow(over: Partial<WebhookRow> = {}): WebhookRow {
  return {
    id: 'w1',
    teamId: null,
    createdBy: null,
    url: 'https://hooks.example.com/w1',
    provider: 'generic',
    eventFilter: JSON.stringify({ events: ['task.updated'] }),
    secret: 'whsec_test',
    enabled: true,
    createdAt: '2026-06-30T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z',
    ...over,
  };
}

function deliveryRow(over: Partial<WebhookDeliveryRow> = {}): WebhookDeliveryRow {
  return {
    id: 'd1',
    webhookId: 'w1',
    teamId: null,
    event: 'task.updated',
    status: 'success',
    responseCode: 200,
    attempts: 1,
    error: null,
    payload: '{"event":"task.updated","at":"x","task":{"id":"t1"}}',
    createdAt: '2026-06-30T00:00:01.000Z',
    ...over,
  };
}

let repo: { findById: ReturnType<typeof vi.fn> };
let deliveriesRepo: { listByWebhook: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
let deliveryService: { dispatch: ReturnType<typeof vi.fn>; dispatchBody: ReturnType<typeof vi.fn> };
let service: WebhooksService;

beforeEach(() => {
  repo = { findById: vi.fn().mockReturnValue(webhookRow()) };
  deliveriesRepo = {
    listByWebhook: vi.fn().mockReturnValue([deliveryRow()]),
    findById: vi.fn(),
  };
  deliveryService = {
    dispatch: vi.fn().mockResolvedValue('d-new'),
    dispatchBody: vi.fn().mockResolvedValue('d-new'),
  };
  service = new WebhooksService(
    repo as never,
    undefined,
    undefined,
    deliveriesRepo as never,
    deliveryService as never,
  );
});

describe('WebhooksService — deliveries (Theme D)', () => {
  it('listDeliveries hydrates the endpoint rows', () => {
    const out = service.listDeliveries('w1', null, null);
    expect(deliveriesRepo.listByWebhook).toHaveBeenCalledWith('w1');
    expect(out[0]).toMatchObject({ id: 'd1', webhookId: 'w1', status: 'success', responseCode: 200 });
  });

  it('listDeliveries 404s for an endpoint outside the team scope', () => {
    repo.findById.mockReturnValue(webhookRow({ teamId: 'other-team' }));
    expect(() => service.listDeliveries('w1', 'my-team', 'u1')).toThrow(WebhookDoesNotExistError);
  });

  it('sendTest dispatches a synthetic task.updated and returns the recorded delivery', async () => {
    deliveriesRepo.findById.mockReturnValue(deliveryRow({ id: 'd-new' }));
    const out = await service.sendTest('w1', null, null);

    expect(deliveryService.dispatch).toHaveBeenCalledTimes(1);
    const [row, event, payload] = deliveryService.dispatch.mock.calls[0]!;
    expect(row.id).toBe('w1');
    expect(event).toBe('task.updated');
    expect(payload.task.title).toBe('midnite test event');
    expect(out.id).toBe('d-new');
  });

  it('redeliver replays the stored payload via dispatchBody', async () => {
    deliveriesRepo.findById
      .mockReturnValueOnce(deliveryRow({ id: 'd1', payload: '{"replay":true}' })) // lookup
      .mockReturnValueOnce(deliveryRow({ id: 'd-new' })); // requireDelivery
    const out = await service.redeliver('w1', 'd1', null, null);

    expect(deliveryService.dispatchBody).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'w1' }),
      'task.updated',
      '{"replay":true}',
    );
    expect(out.id).toBe('d-new');
  });

  it('redeliver 404s when the delivery is unknown or belongs to another endpoint', async () => {
    deliveriesRepo.findById.mockReturnValue(deliveryRow({ webhookId: 'other' }));
    await expect(service.redeliver('w1', 'd1', null, null)).rejects.toThrow(
      WebhookDeliveryDoesNotExistError,
    );
  });
});
