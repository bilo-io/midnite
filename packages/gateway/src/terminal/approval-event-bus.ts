import { Injectable } from '@nestjs/common';
import type { ApprovalsWsEvent } from '@midnite/shared';

type Listener = (event: ApprovalsWsEvent) => void;

/** In-process pub/sub for approval inbox events.
 *  ApprovalService emits when a pending approval is added or resolved;
 *  ApprovalsGateway subscribes and fans out to connected inbox clients. */
@Injectable()
export class ApprovalEventBus {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: ApprovalsWsEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // broken subscriber must not break approval flow
      }
    }
  }
}
