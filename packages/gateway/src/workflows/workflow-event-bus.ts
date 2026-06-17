import { Injectable } from '@nestjs/common';
import type { WorkflowEvent } from '@midnite/shared';

type Listener = (event: WorkflowEvent) => void;

/**
 * In-process pub/sub for workflow run events. The engine emits; the WS gateway
 * subscribes and fans out to connected clients. Decouples the engine from the
 * transport (same philosophy as the terminal's TerminalSubscriber).
 */
@Injectable()
export class WorkflowEventBus {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: WorkflowEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // a broken subscriber must not break the run
      }
    }
  }
}
