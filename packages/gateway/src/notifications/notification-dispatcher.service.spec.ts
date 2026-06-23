import type { MidniteConfig, Notification } from '@midnite/shared';
import { describe, expect, it, vi } from 'vitest';
import type { NotificationChannel } from './channels/notification-channel';
import { NotificationDispatcher } from './notification-dispatcher.service';

const config = { notifications: { channels: {} } } as unknown as MidniteConfig;

const notification = { id: 'n1', kind: 'task.done', title: 't' } as unknown as Notification;

function channel(name: string, enabled: boolean, send = vi.fn().mockResolvedValue(undefined)): NotificationChannel {
  return { name, enabled: () => enabled, send };
}

describe('NotificationDispatcher', () => {
  it('sends to every enabled channel and skips disabled ones', async () => {
    const on1 = channel('a', true);
    const on2 = channel('b', true);
    const off = channel('c', false);
    const dispatcher = new NotificationDispatcher(config, [on1, on2, off]);

    await dispatcher.dispatch(notification);

    expect(on1.send).toHaveBeenCalledWith(notification);
    expect(on2.send).toHaveBeenCalledWith(notification);
    expect(off.send).not.toHaveBeenCalled();
  });

  it('isolates a failing channel — the others still deliver', async () => {
    const boom = channel('boom', true, vi.fn().mockRejectedValue(new Error('down')));
    const ok = channel('ok', true);
    const dispatcher = new NotificationDispatcher(config, [boom, ok]);

    await expect(dispatcher.dispatch(notification)).resolves.toBeUndefined();
    expect(ok.send).toHaveBeenCalledWith(notification);
  });
});
