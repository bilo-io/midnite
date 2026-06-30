import { describe, expect, it } from 'vitest';

import {
  WebhookCreateRequestSchema,
  WebhookEventFilterSchema,
  WebhookUpdateRequestSchema,
} from './webhook.js';

describe('WebhookCreateRequestSchema', () => {
  it('parses a valid endpoint and defaults enabled to true', () => {
    const parsed = WebhookCreateRequestSchema.parse({
      url: 'https://hooks.example.com/abc',
      provider: 'slack',
      eventFilter: { events: ['task.updated'], statuses: ['done'] },
    });
    expect(parsed.enabled).toBe(true);
    expect(parsed.eventFilter.statuses).toEqual(['done']);
  });

  it('rejects a non-URL', () => {
    expect(() =>
      WebhookCreateRequestSchema.parse({ url: 'not a url', provider: 'generic', eventFilter: { events: ['task.created'] } }),
    ).toThrow();
  });

  it('rejects an unknown provider', () => {
    expect(() =>
      WebhookCreateRequestSchema.parse({ url: 'https://x.io', provider: 'telegram', eventFilter: { events: ['task.created'] } }),
    ).toThrow();
  });
});

describe('WebhookEventFilterSchema', () => {
  it('requires at least one event', () => {
    expect(() => WebhookEventFilterSchema.parse({ events: [] })).toThrow();
  });

  it('allows omitting statuses (every update fires)', () => {
    const f = WebhookEventFilterSchema.parse({ events: ['task.created', 'task.deleted'] });
    expect(f.statuses).toBeUndefined();
  });
});

describe('WebhookUpdateRequestSchema', () => {
  it('is fully partial (empty object is valid)', () => {
    expect(WebhookUpdateRequestSchema.parse({})).toEqual({});
  });

  it('validates url when present', () => {
    expect(() => WebhookUpdateRequestSchema.parse({ url: 'bad' })).toThrow();
    expect(WebhookUpdateRequestSchema.parse({ enabled: false })).toEqual({ enabled: false });
  });
});
