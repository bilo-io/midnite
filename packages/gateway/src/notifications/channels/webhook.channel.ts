import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MidniteConfig, Notification, NotificationsConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../../config.token';
import { deliverWebhook } from '../../lib/safe-webhook-delivery';
import type { NotificationChannel } from './notification-channel';

/**
 * Generic outbound channel: POSTs the notification JSON to a configured URL via
 * the shared {@link deliverWebhook} core (SSRF guard + bounded retry/backoff) —
 * a loopback/private URL is refused, so the gateway can't be pointed at internal
 * services. Best-effort; a delivery failure is logged, never thrown (the
 * dispatcher and the in-app feed are unaffected). Off unless `channels.webhook`
 * is set.
 */
@Injectable()
export class WebhookChannel implements NotificationChannel {
  readonly name = 'webhook';
  private readonly logger = new Logger(WebhookChannel.name);

  constructor(@Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig) {}

  enabled(config: NotificationsConfig): boolean {
    return Boolean(config.channels.webhook);
  }

  async send(notification: Notification): Promise<void> {
    const url = this.config.notifications.channels.webhook;
    if (!url) return;
    const result = await deliverWebhook(url, JSON.stringify(notification));
    if (!result.ok) {
      this.logger.warn(
        `webhook delivery failed${result.responseCode ? ` (${result.responseCode})` : ''}: ${result.error ?? 'unknown'}`,
      );
    }
  }
}
