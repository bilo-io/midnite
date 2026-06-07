import { Inject, Injectable } from '@nestjs/common';
import { NODE_EXECUTORS, type NodeExecutor } from './node-executor';

@Injectable()
export class ExecutorRegistry {
  private readonly byType = new Map<string, NodeExecutor>();

  constructor(@Inject(NODE_EXECUTORS) executors: NodeExecutor[]) {
    for (const executor of executors) this.byType.set(executor.typeId, executor);
  }

  get(typeId: string): NodeExecutor | undefined {
    return this.byType.get(typeId);
  }
}
