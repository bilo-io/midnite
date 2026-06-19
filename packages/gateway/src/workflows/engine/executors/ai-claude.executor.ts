import { Inject, Injectable } from '@nestjs/common';
import { AiClaudeParamsSchema, type AiClaudeParams } from '@midnite/shared';
import { LlmService } from '../../../agent/llm/llm.service';
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

  constructor(@Inject(LlmService) private readonly llm: LlmService) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = AiClaudeParamsSchema.parse(ctx.params) as AiClaudeParams;
    // No provider override → must have a usable active provider. With an override
    // the chosen adapter throws its own clear error if it isn't configured.
    if (!params.provider && !this.llm.enabled) {
      throw new Error('AI is unavailable — add an API key for the active provider in settings.');
    }
    // Honour an explicit per-node model; otherwise use the active provider's act
    // model. Provider-specific alias resolution happens inside the adapter.
    const requested = params.model?.trim() || this.llm.getActModel();
    ctx.log('info', `AI ${params.provider ?? 'active'} ${requested} (maxTokens=${params.maxTokens})`);

    const { text, model } = await this.llm.generateTextVia(
      params.provider,
      {
        model: requested,
        maxTokens: params.maxTokens,
        ...(params.system ? { system: params.system } : {}),
        messages: [{ role: 'user', text: buildPrompt(params.prompt, ctx.input) }],
        signal: ctx.signal,
      },
      'workflow',
    );

    return { text, model };
  }
}
