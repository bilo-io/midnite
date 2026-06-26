import { Injectable } from '@nestjs/common';
import type { IdeaEvent } from '@midnite/shared';

type Listener = (event: IdeaEvent) => void;

/**
 * In-process pub/sub for idea events. `IdeaService` emits on every mutation;
 * the WS gateway subscribes and fans out to connected clients.
 * Mirrors `TaskEventBus` / `WorkflowEventBus`.
 */
@Injectable()
export class IdeaEventBus {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: IdeaEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // a broken subscriber must not break a mutation
      }
    }
  }
}
