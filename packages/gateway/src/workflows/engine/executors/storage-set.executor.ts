import { Injectable } from '@nestjs/common';
import { StorageSetParamsSchema } from '@midnite/shared';
import { WorkflowStorageService } from '../../workflow-storage.service';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/**
 * storage.set — persist `value` under `key` in the workflow's KV store. The engine
 * has already resolved any `{{expr}}` in key/value before this runs. Returns the
 * stored value so a later node (or `{{$node}}`) in the same run can read it back.
 */
@Injectable()
export class StorageSetExecutor implements NodeExecutor {
  readonly typeId = 'storage.set';

  constructor(private readonly storage: WorkflowStorageService) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const { key, value } = StorageSetParamsSchema.parse(ctx.params);
    this.storage.set(ctx.workflowId, key, value);
    ctx.log('info', `stored value under "${key}"`);
    return value ?? null;
  }
}
