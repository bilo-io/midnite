import type { Status, Task, WebhookEvent, WebhookProvider } from '@midnite/shared';

/** The canonical generic payload (also the body generic endpoints receive verbatim). */
export type WebhookPayload = { event: WebhookEvent; at: string; task: Task };

const STATUS_LABEL: Record<Status, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  wip: 'In progress',
  waiting: 'Waiting',
  done: 'Done',
  abandoned: 'Abandoned',
};

/**
 * A terse one-line summary of the event, shared by the Slack + Discord chat
 * formatters. Plain text (no markup) so it's safe in either provider's field.
 */
export function summarize(payload: WebhookPayload): string {
  const { event, task } = payload;
  const kind = task.kind && task.kind !== 'unknown' ? task.kind : 'task';
  const where = task.repo ? ` (${task.repo})` : '';
  if (event === 'task.created') return `New ${kind}: ${task.title}${where}`;
  if (event === 'task.deleted') return `Deleted ${kind}: ${task.title}${where}`;
  return `${task.title} → ${STATUS_LABEL[task.status]}${where}`;
}

/** Slack incoming-webhook body: a single `text` field (mrkdwn-safe plain text). */
export function formatSlack(payload: WebhookPayload): { text: string } {
  return { text: summarize(payload) };
}

/** Discord webhook body: a `content` string. */
export function formatDiscord(payload: WebhookPayload): { content: string } {
  return { content: summarize(payload) };
}

/**
 * Serialize the event for an endpoint's provider (Phase 44 Theme C). Slack and
 * Discord get a terse chat message; `generic` gets the canonical signed JSON
 * event verbatim — the stable, documented contract custom receivers rely on.
 * The HMAC signature (Theme B) is computed over whatever string this returns.
 */
export function formatWebhookBody(provider: WebhookProvider, payload: WebhookPayload): string {
  switch (provider) {
    case 'slack':
      return JSON.stringify(formatSlack(payload));
    case 'discord':
      return JSON.stringify(formatDiscord(payload));
    case 'generic':
    default:
      return JSON.stringify(payload);
  }
}
