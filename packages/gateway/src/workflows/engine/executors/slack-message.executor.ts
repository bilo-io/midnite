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

    const cred = this.credentials.resolve(params.credentialId);
    if (!cred) {
      throw new Error(`credential ${params.credentialId} not found or could not be decrypted`);
    }
    if (cred.type !== 'slack') {
      throw new Error(`expected a 'slack' credential, got '${cred.type}'`);
    }

    ctx.log('info', `posting to ${params.channel}`);

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${cred.token}`,
      },
      body: JSON.stringify({ channel: params.channel, text: params.text }),
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
