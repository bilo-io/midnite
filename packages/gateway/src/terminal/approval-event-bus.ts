import { Injectable } from '@nestjs/common';
import type { ApprovalsWsEvent } from '@midnite/shared';

type Listener = (event: ApprovalsWsEvent) => void;

/** In-process pub/sub bridge between ApprovalService (emit) and ApprovalsGateway (subscribe). */
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
        // a broken subscriber must not break the approval flow
      }
    }
  }
}
