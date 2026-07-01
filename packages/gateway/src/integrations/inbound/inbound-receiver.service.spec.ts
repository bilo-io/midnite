import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import type { InboundDeliveryRow, InboundSourceRow } from '../../db/schema';
import type { InboundDeliveriesRepository } from './inbound-deliveries.repository';
import type { InboundSourcesRepository } from './inbound-sources.repository';
import type { TasksService } from '../../tasks/tasks.service';
import {
  InboundReceiverService,
  InboundSignatureError,
  InboundSourceUnavailableError,
} from './inbound-receiver.service';
import type { InboundRequest } from './adapters';

const SECRET = 'insec_test';

function source(over: Partial<InboundSourceRow> = {}): InboundSourceRow {
  return {
    id: 's1',
    teamId: null,
    createdBy: 'u1',
    provider: 'github',
    eventFilter: JSON.stringify({ events: [] }),
    secret: SECRET, // no crypto in the test → stored raw
    defaultRepo: null,
    defaultProjectId: null,
    enabled: true,
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}

/** A validly-signed GitHub issues.opened request. */
function githubReq(body: object, event = 'issues', delivery = 'd1'): InboundRequest {
  const raw = JSON.stringify(body);
  const sig = `sha256=${createHmac('sha256', SECRET).update(raw).digest('hex')}`;
  return {
    rawBody: raw,
    parsed: body,
    headers: { 'x-github-event': event, 'x-hub-signature-256': sig, 'x-github-delivery': delivery },
  };
}

const ISSUE = { action: 'opened', issue: { id: 1, title: 'Bug', body: 'boom', html_url: 'https://gh/1' } };

function harness(sourceRow: InboundSourceRow | undefined) {
  const created: InboundDeliveryRow[] = [];
  const sources = { findById: vi.fn().mockReturnValue(sourceRow) } as unknown as InboundSourcesRepository;
  const deliveries = {
    insert: vi.fn((row: InboundDeliveryRow) => {
      created.push(row);
      return row;
    }),
    findCreated: vi.fn().mockReturnValue(undefined),
  } as unknown as InboundDeliveriesRepository;
  const tasks = {
    createFromPrompt: vi.fn().mockResolvedValue({ id: 't1' }),
    addLink: vi.fn(),
  } as unknown as TasksService;
  const service = new InboundReceiverService(sources, deliveries, tasks, undefined);
  return { service, sources, deliveries, tasks, recorded: created };
}

describe('InboundReceiverService', () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => {
    h = harness(source());
  });

  it('creates a task for a verified, matching event and records `created` + backlink', async () => {
    const res = await h.service.receive('s1', githubReq(ISSUE));
    expect(res).toEqual({ result: 'created', taskId: 't1' });
    expect(h.tasks.createFromPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'Bug\n\nboom', createdBy: 'u1' }),
      { emit: true },
    );
    expect(h.tasks.addLink).toHaveBeenCalledWith('t1', 'https://gh/1', 'github source');
    expect(h.recorded.at(-1)).toMatchObject({ result: 'created', taskId: 't1', externalId: 'd1' });
  });

  it('404s an unknown or disabled source', async () => {
    await expect(harness(undefined).service.receive('x', githubReq(ISSUE))).rejects.toBeInstanceOf(
      InboundSourceUnavailableError,
    );
    const disabled = harness(source({ enabled: false }));
    await expect(disabled.service.receive('s1', githubReq(ISSUE))).rejects.toBeInstanceOf(
      InboundSourceUnavailableError,
    );
  });

  it('rejects a bad signature (401) and records `rejected`, no task', async () => {
    const bad = githubReq(ISSUE);
    bad.rawBody = `${bad.rawBody} `; // tamper after signing
    await expect(h.service.receive('s1', bad)).rejects.toBeInstanceOf(InboundSignatureError);
    expect(h.tasks.createFromPrompt).not.toHaveBeenCalled();
    expect(h.recorded.at(-1)).toMatchObject({ result: 'rejected' });
  });

  it('ignores a non-matching event when a filter is set', async () => {
    h = harness(source({ eventFilter: JSON.stringify({ events: ['pull_request.opened'] }) }));
    const res = await h.service.receive('s1', githubReq(ISSUE));
    expect(res.result).toBe('ignored');
    expect(h.tasks.createFromPrompt).not.toHaveBeenCalled();
    expect(h.recorded.at(-1)).toMatchObject({ result: 'ignored' });
  });

  it('skips a duplicate external id (prior created delivery)', async () => {
    (h.deliveries.findCreated as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'prev' });
    const res = await h.service.receive('s1', githubReq(ISSUE));
    expect(res.result).toBe('skipped-duplicate');
    expect(h.tasks.createFromPrompt).not.toHaveBeenCalled();
  });

  it('records `failed` (not throw) when task creation blows up — best-effort', async () => {
    (h.tasks.createFromPrompt as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'));
    const res = await h.service.receive('s1', githubReq(ISSUE));
    expect(res.result).toBe('failed');
    expect(h.recorded.at(-1)).toMatchObject({ result: 'failed', error: 'db down' });
  });

  it('records `failed` for an unmappable (titleless) payload', async () => {
    const res = await h.service.receive('s1', githubReq({ action: 'opened', issue: { id: 2 } }));
    expect(res.result).toBe('failed');
    expect(h.tasks.createFromPrompt).not.toHaveBeenCalled();
  });
});
