import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  UnsafeWebhookUrlError,
  WebhookDoesNotExistError,
  WebhookForbiddenError,
  WebhooksService,
} from './webhooks.service';
import type { WebhookRow } from '../db/schema';

function makeRow(over: Partial<WebhookRow> = {}): WebhookRow {
  return {
    id: 'w1',
    teamId: 'team-1',
    createdBy: 'u1',
    url: 'https://hooks.example.com/w1',
    provider: 'slack',
    eventFilter: JSON.stringify({ events: ['task.updated'], statuses: ['done'] }),
    secret: 'enc-secret',
    enabled: true,
    createdAt: '2026-06-30T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z',
    ...over,
  };
}

function makeRepo() {
  return { list: vi.fn(), findById: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn() };
}

const crypto = { isEnabled: () => true, encrypt: (s: string) => `enc:${s}` } as never;
// team-1 admin u1; member u2.
const teams = { getMembership: (_t: string, u: string) => (u === 'u1' ? 'admin' : 'member') } as never;

let repo: ReturnType<typeof makeRepo>;
let svc: WebhooksService;

beforeEach(() => {
  repo = makeRepo();
  svc = new WebhooksService(repo as never, crypto, teams);
});

const CREATE = {
  url: 'https://hooks.example.com/new',
  provider: 'slack' as const,
  eventFilter: { events: ['task.updated' as const], statuses: ['done' as const] },
  enabled: true,
};

describe('WebhooksService.create', () => {
  it('encrypts the secret, returns the raw secret once, and omits it from the webhook', () => {
    repo.insert.mockImplementation((r: WebhookRow) => r);
    const { webhook, secret } = svc.create('team-1', 'u1', CREATE);

    expect(secret).toMatch(/^whsec_/);
    expect(webhook).not.toHaveProperty('secret');
    // Stored secret is the encrypted form, never the raw.
    const stored = repo.insert.mock.calls[0]![0] as WebhookRow;
    expect(stored.secret).toBe(`enc:${secret}`);
    expect(webhook.eventFilter).toEqual(CREATE.eventFilter);
  });

  it('rejects an SSRF-unsafe URL', () => {
    expect(() => svc.create('team-1', 'u1', { ...CREATE, url: 'http://127.0.0.1/x' })).toThrow(
      UnsafeWebhookUrlError,
    );
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('forbids a non-admin team member', () => {
    expect(() => svc.create('team-1', 'u2', CREATE)).toThrow(WebhookForbiddenError);
  });

  it('allows creation with no team context (single-user)', () => {
    repo.insert.mockImplementation((r: WebhookRow) => r);
    expect(() => svc.create(null, null, CREATE)).not.toThrow();
  });
});

describe('WebhooksService.list', () => {
  it('hydrates rows without the secret', () => {
    repo.list.mockReturnValue([makeRow()]);
    const out = svc.list('team-1');
    expect(out[0]).not.toHaveProperty('secret');
    expect(out[0]!.eventFilter).toEqual({ events: ['task.updated'], statuses: ['done'] });
  });
});

describe('WebhooksService.update / remove (scoping + RBAC)', () => {
  it('404s when the id is in another team', () => {
    repo.findById.mockReturnValue(makeRow({ teamId: 'other' }));
    expect(() => svc.update('w1', 'team-1', 'u1', { enabled: false })).toThrow(
      WebhookDoesNotExistError,
    );
  });

  it('updates within scope', () => {
    repo.findById.mockReturnValue(makeRow());
    repo.update.mockImplementation((_id: string, f: Partial<WebhookRow>) => makeRow(f));
    const out = svc.update('w1', 'team-1', 'u1', { enabled: false });
    expect(out.enabled).toBe(false);
  });

  it('forbids a non-admin', () => {
    expect(() => svc.remove('w1', 'team-1', 'u2')).toThrow(WebhookForbiddenError);
  });
});

describe('WebhooksService.rotateSecret', () => {
  it('issues a fresh secret and re-encrypts it', () => {
    repo.findById.mockReturnValue(makeRow());
    repo.update.mockImplementation((_id: string, f: Partial<WebhookRow>) => makeRow(f));
    const { secret } = svc.rotateSecret('w1', 'team-1', 'u1');
    expect(secret).toMatch(/^whsec_/);
    const stored = repo.update.mock.calls[0]![1] as Partial<WebhookRow>;
    expect(stored.secret).toBe(`enc:${secret}`);
  });
});
