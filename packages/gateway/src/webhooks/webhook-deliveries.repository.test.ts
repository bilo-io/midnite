import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { WebhookDeliveriesRepository } from './webhook-deliveries.repository';
import type { WebhookDeliveryInsert } from '../db/schema';

let repo: WebhookDeliveriesRepository;

beforeEach(() => {
  repo = new WebhookDeliveriesRepository(createTestDb().db);
});

function row(id: string, over: Partial<WebhookDeliveryInsert> = {}): WebhookDeliveryInsert {
  return {
    id,
    webhookId: 'w1',
    teamId: 'team-1',
    event: 'task.updated',
    status: 'success',
    responseCode: 200,
    attempts: 1,
    error: null,
    payload: '{"event":"task.updated"}',
    createdAt: `2026-06-30T00:00:0${id.slice(-1)}.000Z`,
    ...over,
  };
}

describe('WebhookDeliveriesRepository', () => {
  it('insert + findById round-trips', () => {
    repo.insert(row('d1'));
    expect(repo.findById('d1')?.responseCode).toBe(200);
  });

  it('listByWebhook is scoped to the endpoint and newest-first', () => {
    repo.insert(row('d1', { webhookId: 'w1' }));
    repo.insert(row('d2', { webhookId: 'w2' }));
    repo.insert(row('d3', { webhookId: 'w1' }));
    expect(repo.listByWebhook('w1').map((r) => r.id)).toEqual(['d3', 'd1']);
  });

  it('persists a failed delivery with its error + null response code', () => {
    repo.insert(row('d1', { status: 'failed', responseCode: null, error: 'timeout', attempts: 3 }));
    const got = repo.findById('d1');
    expect(got).toMatchObject({ status: 'failed', responseCode: null, error: 'timeout', attempts: 3 });
  });
});
