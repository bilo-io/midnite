import { Injectable } from '@nestjs/common';
import type { NotificationEvent } from '@midnite/shared';

type Listener = (event: NotificationEvent) => void;

/**
 * In-process pub/sub for notification events. `NotificationsService` emits on
 * insert; the WS gateway subscribes and fans out to connected clients. Decouples
 * the service from the transport (same shape as `TaskEventBus`).
 */
@Injectable()
export class NotificationEventBus {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: NotificationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // a broken subscriber must not break notification delivery
      }
    }
  }
}
