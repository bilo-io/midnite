import { Injectable } from '@nestjs/common';
import type { TaskBoardEvent } from '@midnite/shared';

type Listener = (event: TaskBoardEvent) => void;

/**
 * In-process pub/sub for task-board events. `TasksService` emits on every state
 * transition; the WS gateway subscribes and fans out to connected boards.
 * Decouples the service from the transport (same shape as `WorkflowEventBus`).
 */
@Injectable()
export class TaskEventBus {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: TaskBoardEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // a broken subscriber must not break a task mutation
      }
    }
  }
}
