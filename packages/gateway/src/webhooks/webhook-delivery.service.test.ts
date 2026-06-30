import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task, WebhookEventFilter } from '@midnite/shared';

import { TaskEventBus } from '../tasks/task-event-bus';
import type { WebhookRow } from '../db/schema';
import { WebhookDeliveryService, eventMatches } from './webhook-delivery.service';
import { verifySignature } from './lib/sign';

const okResponse = { ok: true, status: 200 } as Response;

function filter(over: Partial<WebhookEventFilter> = {}): WebhookEventFilter {
  return { events: ['task.created', 'task.updated'], ...over };
}

function webhookRow(over: Partial<WebhookRow> = {}): WebhookRow {
  return {
    id: 'w1',
    teamId: 'team-1',
    createdBy: 'u1',
    url: 'https://hooks.example.com/w1',
    provider: 'generic',
    eventFilter: JSON.stringify(filter()),
    secret: 'whsec_test',
    enabled: true,
    createdAt: '2026-06-30T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z',
    ...over,
  };
}

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Ship it',
    status: 'wip',
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    events: [],
    teamId: 'team-1',
    ...over,
  };
}

describe('eventMatches', () => {
  it('matches when the event type is listed', () => {
    expect(eventMatches(filter({ events: ['task.created'] }), 'task.created', 'todo')).toBe(true);
    expect(eventMatches(filter({ events: ['task.created'] }), 'task.updated', 'todo')).toBe(false);
  });

  it('narrows task.updated by statuses when provided', () => {
    const f = filter({ events: ['task.updated'], statuses: ['done'] });
    expect(eventMatches(f, 'task.updated', 'done')).toBe(true);
    expect(eventMatches(f, 'task.updated', 'wip')).toBe(false);
  });

  it('ignores statuses for non-update events', () => {
    const f = filter({ events: ['task.created'], statuses: ['done'] });
    expect(eventMatches(f, 'task.created', 'wip')).toBe(true);
  });
});

describe('WebhookDeliveryService', () => {
  let bus: TaskEventBus;
  let webhooks: { list: ReturnType<typeof vi.fn> };
  let deliveries: { insert: ReturnType<typeof vi.fn> };
  let service: WebhookDeliveryService;

  beforeEach(() => {
    bus = new TaskEventBus();
    webhooks = { list: vi.fn().mockReturnValue([webhookRow()]) };
    deliveries = { insert: vi.fn((row) => ({ ...row })) };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse);
    // crypto omitted → secret used as-is (plaintext path).
    service = new WebhookDeliveryService(bus, webhooks as never, deliveries as never);
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.restoreAllMocks();
  });

  it('dispatch() signs the body and records a success delivery', async () => {
    const wh = webhookRow();
    const payload = { event: 'task.updated', at: '2026-06-30T12:00:00.000Z', task: task() };
    await service.dispatch(wh, 'task.updated', payload);

    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]![1]!;
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;
    expect(verifySignature('whsec_test', body, headers['x-midnite-timestamp']!, headers['x-midnite-signature']!)).toBe(true);

    expect(deliveries.insert).toHaveBeenCalledTimes(1);
    const row = deliveries.insert.mock.calls[0]![0];
    expect(row).toMatchObject({ webhookId: 'w1', event: 'task.updated', status: 'success', responseCode: 200 });
    expect(row.payload).toBe(body);
  });

  it('records a failed delivery on a non-2xx', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: false, status: 502 } as Response);
    await service.dispatch(webhookRow(), 'task.updated', { event: 'task.updated', at: 'x', task: task() });
    expect(deliveries.insert.mock.calls[0]![0]).toMatchObject({ status: 'failed', responseCode: 502 });
  });

  it('formats the body for the endpoint provider (Theme C)', async () => {
    await service.dispatch(webhookRow({ provider: 'slack' }), 'task.updated', {
      event: 'task.updated',
      at: 'x',
      task: task({ title: 'Hello', status: 'done' }),
    });
    const init = vi.mocked(globalThis.fetch).mock.calls[0]![1]!;
    expect(JSON.parse(init.body as string)).toEqual({ text: 'Hello → Done' });
  });

  it('fans a matching task.updated out to the team endpoints', async () => {
    service.onModuleInit();
    bus.emit({ type: 'task.updated', at: '2026-06-30T12:00:00.000Z', task: task({ status: 'done' }) });
    await flush();
    expect(webhooks.list).toHaveBeenCalledWith('team-1');
    expect(deliveries.insert).toHaveBeenCalledTimes(1);
  });

  it('skips disabled endpoints and non-matching status filters', async () => {
    webhooks.list.mockReturnValue([
      webhookRow({ id: 'off', enabled: false }),
      webhookRow({ id: 'filtered', eventFilter: JSON.stringify(filter({ events: ['task.updated'], statuses: ['done'] })) }),
    ]);
    service.onModuleInit();
    bus.emit({ type: 'task.updated', at: 'x', task: task({ status: 'wip' }) }); // not 'done'
    await flush();
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
    expect(deliveries.insert).not.toHaveBeenCalled();
  });

  it('ignores events it cannot team-scope (task.deleted) and bulk/agent events', async () => {
    service.onModuleInit();
    bus.emit({ type: 'task.deleted', at: 'x', id: 't1' });
    bus.emit({ type: 'tasks.bulkCreated', at: 'x', taskIds: ['t1'] });
    await flush();
    expect(webhooks.list).not.toHaveBeenCalled();
    expect(deliveries.insert).not.toHaveBeenCalled();
  });
});

/** Let the fire-and-forget fanOut microtasks settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
