import { Inject, Injectable } from '@nestjs/common';
import { SlackMessageParamsSchema } from '@midnite/shared';
import { WorkflowCredentialsService } from '../../credentials/workflow-credentials.service';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/** Post a message to a Slack channel using the Slack Web API `chat.postMessage`. */
@Injectable()
export class SlackMessageExecutor implements NodeExecutor {
  readonly typeId = 'slack.message';

  constructor(
    @Inject(WorkflowCredentialsService)
    private readonly credentials: WorkflowCredentialsService,
  ) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = SlackMessageParamsSchema.parse(ctx.params);

    // An unbound template credential slot (never wired up on install) leaves the
    // `slot:…` sentinel in place. Treat that as "Slack isn't configured" and skip
    // cleanly rather than failing the run — the digest pipeline (Phase 62 E)
    // guarantees in-app delivery and makes Slack best-effort. A real credential id
    // that fails to resolve is still a genuine error below.
    if (params.credentialId.startsWith('slot:')) {
      ctx.log('info', `Slack credential slot "${params.credentialId}" is unbound — skipping post`);
      return { ok: false, skipped: true, reason: 'unbound-credential-slot' };
    }

    const cred = await this.credentials.resolve(params.credentialId);
    if (!cred) {
      throw new Error(`credential ${params.credentialId} not found or could not be decrypted`);
    }
    if (cred.type !== 'slack') {
      throw new Error(`expected a 'slack' credential, got '${cred.type}'`);
    }

    ctx.log('info', `posting to ${params.channel}`);

    // `blocks` is expressionable; only an actually-resolved array is sent (an
    // unresolved/literal string is ignored). `text` stays as the fallback.
    const blocks = Array.isArray(params.blocks) && params.blocks.length > 0 ? params.blocks : undefined;
    const payload: Record<string, unknown> = { channel: params.channel, text: params.text };
    if (blocks) payload.blocks = blocks;

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${cred.token}`,
      },
      body: JSON.stringify(payload),
      signal: ctx.signal,
    });

    if (!res.ok) {
      throw new Error(`Slack API HTTP error: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as { ok: boolean; error?: string; ts?: string; channel?: string };
    if (!body.ok) {
      throw new Error(`Slack API error: ${body.error ?? 'unknown'}`);
    }

    ctx.log('info', `message posted (ts: ${body.ts ?? '?'})`);
    return { ok: true, ts: body.ts, channel: body.channel };
  }
}
