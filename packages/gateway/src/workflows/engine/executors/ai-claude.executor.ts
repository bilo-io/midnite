import { Inject, Injectable } from '@nestjs/common';
import { AiClaudeParamsSchema, type AiClaudeParams } from '@midnite/shared';
import { AnthropicService } from '../../../agent/anthropic.service';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

// Fold the upstream node's output into the prompt as plain context. Real templating
// (e.g. {{$json.field}}) lands in the logic-nodes phase.
function buildPrompt(prompt: string, input: unknown): string {
  if (input === undefined || input === null) return prompt;
  const ctxStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
  if (!ctxStr || ctxStr === '{}') return prompt;
  return `${prompt}\n\n--- Input from previous step ---\n${ctxStr}`;
}

@Injectable()
export class AiClaudeExecutor implements NodeExecutor {
  readonly typeId = 'ai.claude';

  constructor(@Inject(AnthropicService) private readonly anthropic: AnthropicService) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = AiClaudeParamsSchema.parse(ctx.params) as AiClaudeParams;
    if (!this.anthropic.enabled) {
      throw new Error(
        'Claude is unavailable — set ANTHROPIC_API_KEY or run `claude` to log in.',
      );
    }
    const client = this.anthropic.getClient();
    const model = this.anthropic.resolveModel(params.model);
    ctx.log('info', `Claude ${model} (maxTokens=${params.maxTokens})`);

    const message = await client.messages.create(
      {
        model,
        max_tokens: params.maxTokens,
        system: params.system,
        messages: [{ role: 'user', content: buildPrompt(params.prompt, ctx.input) }],
      },
      { signal: ctx.signal },
    );

    const text = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    return { text, model, stopReason: message.stop_reason };
  }
}
