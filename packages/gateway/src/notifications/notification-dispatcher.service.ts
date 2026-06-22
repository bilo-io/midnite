import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MidniteConfig, Notification } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { NOTIFICATION_CHANNELS, type NotificationChannel } from './channels/notification-channel';

/**
 * Fans a persisted notification to every enabled channel concurrently. Each
 * channel's failure is isolated + logged — one broken sink (a dead webhook)
 * never stops the others (the always-on in-app feed in particular).
 */
@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(NOTIFICATION_CHANNELS) private readonly channels: NotificationChannel[],
  ) {}

  async dispatch(notification: Notification): Promise<void> {
    const enabled = this.channels.filter((c) => c.enabled(this.config.notifications));
    await Promise.all(
      enabled.map(async (channel) => {
        try {
          await channel.send(notification);
        } catch (err) {
          this.logger.warn(
            `notification channel "${channel.name}" failed: ${err instanceof Error ? err.message : 'unknown'}`,
          );
        }
      }),
    );
  }
}
