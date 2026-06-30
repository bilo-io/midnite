import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type {
  Status,
  Task,
  TaskBoardEvent,
  WebhookEvent,
  WebhookEventFilter,
} from '@midnite/shared';
import { CryptoService } from '../crypto/crypto.service';
import { deliverWebhook } from '../lib/safe-webhook-delivery';
import { TaskEventBus } from '../tasks/task-event-bus';
import type { WebhookRow } from '../db/schema';
import { WebhookDeliveriesRepository } from './webhook-deliveries.repository';
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, signPayload } from './lib/sign';
import { WebhooksRepository } from './webhooks.repository';

/**
 * Decide whether an endpoint's filter fires for a given event. `statuses` only
 * narrows `task.updated` (transitions *into* one of those statuses), mirroring
 * Phase 21's `notifyForTask` idea; an empty/absent `statuses` means every update.
 */
export function eventMatches(
  filter: WebhookEventFilter,
  eventType: WebhookEvent,
  status: Status | undefined,
): boolean {
  if (!filter.events.includes(eventType)) return false;
  if (eventType === 'task.updated' && filter.statuses && filter.statuses.length > 0) {
    return status !== undefined && filter.statuses.includes(status);
  }
  return true;
}

/** The canonical generic JSON body (Theme C will branch Slack/Discord off this). */
export type WebhookPayload = { event: WebhookEvent; at: string; task: Task };

/**
 * Phase 44 Theme B — signed delivery engine. Subscribes to the {@link TaskEventBus}
 * and, for every matching enabled endpoint of the task's team, POSTs a signed,
 * retried, recorded delivery. Best-effort: a dispatch never blocks or throws into
 * the task transition (the bus listener returns immediately; delivery is async and
 * self-contained). `task.deleted` carries only an id (no team/status), so it can't
 * be team-scoped here — it's deferred until the event is enriched (Theme D / a
 * follow-up); `task.created` + `task.updated` are fully supported.
 */
@Injectable()
export class WebhookDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookDeliveryService.name);
  private unsubscribe?: () => void;

  constructor(
    @Inject(TaskEventBus) private readonly taskBus: TaskEventBus,
    @Inject(WebhooksRepository) private readonly webhooks: WebhooksRepository,
    @Inject(WebhookDeliveriesRepository) private readonly deliveries: WebhookDeliveriesRepository,
    // Optional so unit specs can wire only what they exercise; explicit token
    // because the e2e gateway runs under `tsx` (no emitted param metadata).
    @Optional() @Inject(CryptoService) private readonly crypto?: CryptoService,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.taskBus.subscribe((event) => this.onTaskEvent(event));
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  private onTaskEvent(event: TaskBoardEvent): void {
    if (event.type !== 'task.created' && event.type !== 'task.updated') return;
    // Fire-and-forget — delivery must never block or throw into the transition.
    void this.fanOut(event.type, event.task, event.at).catch((err) =>
      this.logger.warn(`webhook fan-out error: ${err instanceof Error ? err.message : String(err)}`),
    );
  }

  /** Resolve the team's matching enabled endpoints and dispatch one delivery each. */
  private async fanOut(eventType: WebhookEvent, task: Task, at: string): Promise<void> {
    const matching = this.webhooks
      .list(task.teamId ?? null)
      .filter((w) => w.enabled && eventMatches(parseFilter(w.eventFilter), eventType, task.status));
    if (matching.length === 0) return;
    const payload: WebhookPayload = { event: eventType, at, task };
    await Promise.all(matching.map((w) => this.dispatch(w, eventType, payload)));
  }

  /**
   * Sign + POST a JSON-serialized payload to one endpoint, then record the
   * attempt. Public so Theme D's "send test" can reuse the exact signed path.
   * Returns the recorded delivery id.
   */
  async dispatch(webhook: WebhookRow, event: WebhookEvent, payload: unknown): Promise<string> {
    return this.dispatchBody(webhook, event, JSON.stringify(payload));
  }

  /**
   * Sign + POST an already-serialized body — used by redeliver (Theme D) so a
   * replay re-sends the *exact* stored bytes, not a re-stringified object that
   * could differ in key order/whitespace. Records the attempt; returns its id.
   */
  async dispatchBody(webhook: WebhookRow, event: WebhookEvent, body: string): Promise<string> {
    const timestamp = new Date().toISOString();
    const secret = this.crypto?.decrypt(webhook.secret) ?? webhook.secret;
    const signature = signPayload(secret, body, timestamp);

    const result = await deliverWebhook(webhook.url, body, {
      headers: { [SIGNATURE_HEADER]: signature, [TIMESTAMP_HEADER]: timestamp },
    });

    const row = this.deliveries.insert({
      id: randomUUID(),
      webhookId: webhook.id,
      teamId: webhook.teamId ?? null,
      event,
      status: result.ok ? 'success' : 'failed',
      responseCode: result.responseCode,
      attempts: result.attempts,
      error: result.error,
      payload: body,
      createdAt: timestamp,
    });
    if (!result.ok) {
      this.logger.warn(
        `webhook ${webhook.id} delivery failed${result.responseCode ? ` (${result.responseCode})` : ''}: ${result.error ?? 'unknown'}`,
      );
    }
    return row.id;
  }
}

function parseFilter(raw: string): WebhookEventFilter {
  return JSON.parse(raw) as WebhookEventFilter;
}
