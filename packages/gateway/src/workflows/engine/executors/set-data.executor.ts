import { Injectable } from '@nestjs/common';
import { SetDataParamsSchema } from '@midnite/shared';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * logic.setData — emit an object built from `fields` (key → value). The engine has
 * already resolved any `{{expr}}` in the values before this runs, so we just shape
 * the result: `replace` emits the fields alone; `merge` overlays them onto the
 * incoming input object.
 */
@Injectable()
export class SetDataExecutor implements NodeExecutor {
  readonly typeId = 'logic.setData';

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const { mode, fields } = SetDataParamsSchema.parse(ctx.params);
    if (mode === 'merge') {
      const base = isPlainObject(ctx.input) ? ctx.input : {};
      return { ...base, ...fields };
    }
    return { ...fields };
  }
}
