import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MidniteConfig, Notification, NotificationsConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../../config.token';
import { isSafeHttpUrl } from '../../projects/lib/opengraph';
import type { NotificationChannel } from './notification-channel';

const TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;
/** Base backoff between retries (×attempt): 200ms, 400ms. Capped + bounded. */
const BACKOFF_MS = 200;

/**
 * Generic outbound channel: POSTs the notification JSON to a configured URL.
 * SSRF-guarded via {@link isSafeHttpUrl} — a loopback/private URL is refused, so
 * the gateway can't be pointed at internal services. Best-effort with bounded
 * retry/backoff; a delivery failure is logged, never thrown (the dispatcher and
 * the in-app feed are unaffected). Off unless `channels.webhook` is set.
 *
 * Slack/email are deferred to Phase 14 (they want its credential vault); they
 * slot in as further `NotificationChannel`s.
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
    if (!isSafeHttpUrl(url)) {
      this.logger.warn(`webhook URL is not allowed (SSRF guard) — skipping delivery`);
      return;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(notification),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.ok) return;
        this.logger.warn(`webhook responded ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS})`);
      } catch (err) {
        this.logger.warn(
          `webhook delivery error (attempt ${attempt}/${MAX_ATTEMPTS}): ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
      if (attempt < MAX_ATTEMPTS) await delay(BACKOFF_MS * attempt);
    }
    this.logger.warn(`webhook delivery failed after ${MAX_ATTEMPTS} attempts`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
  });
}
