import { Injectable } from '@nestjs/common';
import { DataFilterParamsSchema } from '@midnite/shared';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * data.filter — keep (`pick`) or drop (`omit`) a set of top-level fields from the
 * input object. A non-object input has no fields to select, so it yields `{}`.
 */
@Injectable()
export class DataFilterExecutor implements NodeExecutor {
  readonly typeId = 'data.filter';

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const { mode, fields } = DataFilterParamsSchema.parse(ctx.params);
    const obj = isPlainObject(ctx.input) ? ctx.input : {};
    const wanted = new Set(fields);
    const entries = Object.entries(obj).filter(([key]) =>
      mode === 'pick' ? wanted.has(key) : !wanted.has(key),
    );
    return Object.fromEntries(entries);
  }
}
