import { Injectable } from '@nestjs/common';
import type { MetricsEvent } from '@midnite/shared';

type Listener = (event: MetricsEvent) => void;

/**
 * In-process pub/sub for live metrics events (Phase 61 F). `MetricsService` emits
 * a gauge snapshot whenever a fleet gauge changes; the WS gateway subscribes and
 * fans out to connected Ops clients. Mirrors `IdeaEventBus` / `TaskEventBus`.
 * Kept separate from `MetricsService` so the service has no dependency on the WS
 * layer (and unit specs can construct it without a bus).
 */
@Injectable()
export class MetricsEventBus {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: MetricsEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // a broken subscriber must not break a gauge write
      }
    }
  }
}
