import { Injectable } from '@nestjs/common';
import { StorageGetParamsSchema } from '@midnite/shared';
import { WorkflowStorageService } from '../../workflow-storage.service';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/**
 * storage.get — read `key` from the workflow's KV store. A key set in an earlier
 * run is visible here. A never-set key yields the configured `defaultValue` (null
 * by default) rather than failing, since the first run legitimately finds nothing.
 */
@Injectable()
export class StorageGetExecutor implements NodeExecutor {
  readonly typeId = 'storage.get';

  constructor(private readonly storage: WorkflowStorageService) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const { key, defaultValue } = StorageGetParamsSchema.parse(ctx.params);
    const stored = this.storage.get(ctx.workflowId, key);
    if (stored === undefined) {
      ctx.log('info', `no value stored under "${key}" — using default`);
      return defaultValue ?? null;
    }
    return stored;
  }
}
