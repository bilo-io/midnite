import { describe, expect, it } from 'vitest';
import type { Task } from '@midnite/shared';

import { formatWebhookBody, summarize, type WebhookPayload } from './format';

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Ship the thing',
    status: 'wip',
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    events: [],
    ...over,
  };
}

function payload(over: Partial<WebhookPayload> = {}): WebhookPayload {
  return { event: 'task.updated', at: '2026-06-30T12:00:00.000Z', task: task(), ...over };
}

describe('summarize', () => {
  it('describes a created task with its kind', () => {
    expect(summarize(payload({ event: 'task.created', task: task({ kind: 'bug' }) }))).toBe(
      'New bug: Ship the thing',
    );
  });

  it('describes an update as a status transition', () => {
    expect(summarize(payload({ task: task({ status: 'done' }) }))).toBe('Ship the thing → Done');
  });

  it('appends the repo when present and falls back to "task" for unknown kind', () => {
    expect(summarize(payload({ task: task({ status: 'waiting', repo: 'acme/web', kind: 'unknown' }) }))).toBe(
      'Ship the thing → Waiting (acme/web)',
    );
  });
});

describe('formatWebhookBody', () => {
  it('wraps Slack messages in { text }', () => {
    expect(JSON.parse(formatWebhookBody('slack', payload()))).toEqual({ text: 'Ship the thing → In progress' });
  });

  it('wraps Discord messages in { content }', () => {
    expect(JSON.parse(formatWebhookBody('discord', payload()))).toEqual({
      content: 'Ship the thing → In progress',
    });
  });

  it('sends the canonical event verbatim for generic', () => {
    const p = payload();
    expect(JSON.parse(formatWebhookBody('generic', p))).toEqual(JSON.parse(JSON.stringify(p)));
  });
});
