import { Injectable } from '@nestjs/common';
import { MergeParamsSchema } from '@midnite/shared';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * logic.merge — fan-in. The engine hands a node with multiple predecessors an
 * array of their outputs (a single predecessor passes its output through). We
 * normalise to an array and combine per `mode`:
 *   shallowMerge — Object.assign the object inputs left-to-right
 *   array        — the inputs as-is, collected
 *   concat       — flatten: array inputs are concatenated, scalars wrapped
 */
@Injectable()
export class MergeExecutor implements NodeExecutor {
  readonly typeId = 'logic.merge';

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const { mode } = MergeParamsSchema.parse(ctx.params);
    const inputs = Array.isArray(ctx.input) ? ctx.input : [ctx.input];
    if (mode === 'array') return inputs;
    if (mode === 'concat') return inputs.flatMap((v) => (Array.isArray(v) ? v : [v]));
    return inputs.reduce<Record<string, unknown>>(
      (acc, v) => (isPlainObject(v) ? { ...acc, ...v } : acc),
      {},
    );
  }
}
