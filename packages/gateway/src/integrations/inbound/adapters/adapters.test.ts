import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';

import { INBOUND_ADAPTERS, type InboundRequest } from './index';

function req(over: Partial<InboundRequest>): InboundRequest {
  return { rawBody: '', headers: {}, parsed: {}, ...over };
}

describe('github adapter', () => {
  const a = INBOUND_ADAPTERS.github;

  it('verifies X-Hub-Signature-256, keys the event, maps an opened issue', () => {
    const body = JSON.stringify({ action: 'opened', issue: { id: 42, title: 'Bug', body: 'boom', html_url: 'https://gh/1' } });
    const sig = `sha256=${createHmac('sha256', 's').update(body).digest('hex')}`;
    const r = req({ rawBody: body, parsed: JSON.parse(body), headers: { 'x-github-event': 'issues', 'x-hub-signature-256': sig, 'x-github-delivery': 'd-1' } });
    expect(a.verify(r, 's')).toBe(true);
    expect(a.eventKey(r)).toBe('issues.opened');
    expect(a.externalId(r)).toBe('d-1');
    expect(a.toTask(r)).toEqual({ prompt: 'Bug\n\nboom', sourceUrl: 'https://gh/1' });
  });

  it('falls back to the subject id when no delivery header', () => {
    const parsed = { action: 'opened', pull_request: { id: 7, title: 'PR' } };
    const r = req({ parsed, headers: { 'x-github-event': 'pull_request' } });
    expect(a.eventKey(r)).toBe('pull_request.opened');
    expect(a.externalId(r)).toBe('7');
    expect(a.toTask(r)).toEqual({ prompt: 'PR', sourceUrl: undefined });
  });
});

describe('linear adapter', () => {
  const a = INBOUND_ADAPTERS.linear;

  it('verifies a bare hex Linear-Signature, keys type.action, maps an issue', () => {
    const body = JSON.stringify({ type: 'Issue', action: 'create', url: 'https://lin/1', data: { id: 'i1', title: 'Task', description: 'do it' } });
    const sig = createHmac('sha256', 's').update(body).digest('hex');
    const r = req({ rawBody: body, parsed: JSON.parse(body), headers: { 'linear-signature': sig } });
    expect(a.verify(r, 's')).toBe(true);
    expect(a.eventKey(r)).toBe('Issue.create');
    expect(a.externalId(r)).toBe('i1');
    expect(a.toTask(r)).toEqual({ prompt: 'Task\n\ndo it', sourceUrl: 'https://lin/1' });
  });
});

describe('generic adapter', () => {
  const a = INBOUND_ADAPTERS.generic;

  it('verifies the timestamped X-Midnite scheme, keys/ids from payload+headers', () => {
    const body = JSON.stringify({ event: 'ticket.new', externalId: 'x9', title: 'Hi', url: 'https://ex/1' });
    const ts = '123';
    const sig = `sha256=${createHmac('sha256', 's').update(`${ts}.${body}`).digest('hex')}`;
    const r = req({ rawBody: body, parsed: JSON.parse(body), headers: { 'x-midnite-signature': sig, 'x-midnite-timestamp': ts } });
    expect(a.verify(r, 's')).toBe(true);
    expect(a.eventKey(r)).toBe('ticket.new');
    expect(a.externalId(r)).toBe('x9');
    expect(a.toTask(r)).toEqual({ prompt: 'Hi', sourceUrl: 'https://ex/1' });
  });

  it('prefers the delivery header for externalId and returns null for an untitled payload', () => {
    const r = req({ parsed: { body: 'no title' }, headers: { 'x-midnite-delivery': 'del-1' } });
    expect(a.externalId(r)).toBe('del-1');
    expect(a.toTask(r)).toBeNull();
  });
});
