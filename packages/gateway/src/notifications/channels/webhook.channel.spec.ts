import type { MidniteConfig, Notification } from '@midnite/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebhookChannel } from './webhook.channel';

const notification = { id: 'n1', kind: 'task.done', title: 'Task finished' } as unknown as Notification;

function make(webhook?: string): WebhookChannel {
  return new WebhookChannel({ notifications: { channels: { webhook } } } as unknown as MidniteConfig);
}

describe('WebhookChannel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('is enabled only when a webhook URL is configured', () => {
    expect(make('https://example.com/hook').enabled({ channels: { webhook: 'https://x' } } as never)).toBe(true);
    expect(make().enabled({ channels: {} } as never)).toBe(false);
  });

  it('POSTs the notification JSON to a safe URL', async () => {
    await make('https://hooks.example.com/abc').send(notification);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://hooks.example.com/abc');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ id: 'n1' });
  });

  it('refuses a loopback/private URL (SSRF guard) — never fetches', async () => {
    await make('http://127.0.0.1/hook').send(notification);
    await make('http://10.0.0.5/hook').send(notification);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing when no webhook is configured', async () => {
    await make().send(notification);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is best-effort: retries then gives up without throwing', async () => {
    vi.useFakeTimers();
    fetchMock.mockRejectedValue(new Error('network down'));
    const promise = make('https://hooks.example.com/abc').send(notification);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3); // MAX_ATTEMPTS
  });
});
