import { Inject, Injectable } from '@nestjs/common';
import type { Notification, NotificationsConfig } from '@midnite/shared';
import { NotificationEventBus } from '../notification-event-bus';
import type { NotificationChannel } from './notification-channel';

/**
 * The in-app channel: emits `notification.created` on the bus, which the WS
 * gateway fans to connected browsers (feed + toasts). Always on by default.
 */
@Injectable()
export class WebChannel implements NotificationChannel {
  readonly name = 'web';

  constructor(@Inject(NotificationEventBus) private readonly bus: NotificationEventBus) {}

  enabled(config: NotificationsConfig): boolean {
    return config.channels.web;
  }

  send(notification: Notification): Promise<void> {
    this.bus.emit({ type: 'notification.created', notification });
    return Promise.resolve();
  }
}
