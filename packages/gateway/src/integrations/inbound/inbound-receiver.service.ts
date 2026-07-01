import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { InboundEventFilter, InboundProvider, InboundResult } from '@midnite/shared';
import { CryptoService } from '../../crypto/crypto.service';
import { TasksService } from '../../tasks/tasks.service';
import type { InboundSourceRow } from '../../db/schema';
import { decryptSecret } from '../lib/managed-secret';
import { INBOUND_ADAPTERS, type InboundRequest } from './adapters';
import { InboundDeliveriesRepository } from './inbound-deliveries.repository';
import { InboundSourcesRepository } from './inbound-sources.repository';

/** Unknown or disabled source → 404 (no hint that the id might exist). */
export class InboundSourceUnavailableError extends Error {
  constructor() {
    super('inbound source not found');
    this.name = 'InboundSourceUnavailableError';
  }
}

/** Bad/absent signature → 401. Recorded as a rejected delivery first. */
export class InboundSignatureError extends Error {
  constructor() {
    super('invalid signature');
    this.name = 'InboundSignatureError';
  }
}

export interface InboundReceiveResult {
  result: InboundResult;
  taskId?: string;
}

/**
 * The signed inbound receiver (Phase 46 B). Verifies the provider signature over
 * the raw body, gates on the event filter, dedups by (source, externalId), and
 * turns a matching event into a board task via `createFromPrompt` — best-effort:
 * every outcome is recorded as a delivery and nothing throws except 401/404.
 */
@Injectable()
export class InboundReceiverService {
  private readonly logger = new Logger(InboundReceiverService.name);

  constructor(
    @Inject(InboundSourcesRepository) private readonly sources: InboundSourcesRepository,
    @Inject(InboundDeliveriesRepository) private readonly deliveries: InboundDeliveriesRepository,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Optional() @Inject(CryptoService) private readonly crypto?: CryptoService,
  ) {}

  async receive(sourceId: string, req: InboundRequest): Promise<InboundReceiveResult> {
    const source = this.sources.findById(sourceId);
    if (!source || !source.enabled) throw new InboundSourceUnavailableError();

    const provider = source.provider as InboundProvider;
    const adapter = INBOUND_ADAPTERS[provider];
    const secret = decryptSecret(this.crypto, source.secret);

    // Verify the signature; a failure (or unusable secret) is a recorded rejection.
    if (!secret || !adapter.verify(req, secret)) {
      this.record(source, provider, adapter.eventKey(req), adapter.externalId(req), 'rejected');
      throw new InboundSignatureError();
    }

    const event = adapter.eventKey(req);
    const externalId = adapter.externalId(req);

    // Event filter: an empty filter accepts everything; otherwise the event must match.
    const filter = this.parseFilter(source.eventFilter);
    if (filter.events.length > 0 && (!event || !filter.events.includes(event))) {
      this.record(source, provider, event, externalId, 'ignored');
      return { result: 'ignored' };
    }

    // Dedup: a prior *created* delivery for this external id is a no-op.
    if (externalId && this.deliveries.findCreated(sourceId, externalId)) {
      this.record(source, provider, event, externalId, 'skipped-duplicate');
      return { result: 'skipped-duplicate' };
    }

    // Map + create — best-effort; a failure is recorded, never thrown.
    try {
      const mapped = adapter.toTask(req);
      if (!mapped) {
        this.record(source, provider, event, externalId, 'failed', undefined, 'payload not mappable to a task');
        return { result: 'failed' };
      }
      const task = await this.tasks.createFromPrompt(
        {
          prompt: mapped.prompt,
          repo: source.defaultRepo ?? undefined,
          projectId: source.defaultProjectId ?? undefined,
          images: [],
          createdBy: source.createdBy ?? undefined,
        },
        { emit: true },
      );
      if (mapped.sourceUrl) {
        try {
          this.tasks.addLink(task.id, mapped.sourceUrl, `${provider} source`);
        } catch {
          // The backlink is a nicety; never fail the delivery over it.
        }
      }
      this.record(source, provider, event, externalId, 'created', task.id);
      return { result: 'created', taskId: task.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`inbound task creation failed for source ${sourceId}: ${message}`);
      this.record(source, provider, event, externalId, 'failed', undefined, message);
      return { result: 'failed' };
    }
  }

  private parseFilter(raw: string): InboundEventFilter {
    try {
      const parsed = JSON.parse(raw) as Partial<InboundEventFilter>;
      return { events: Array.isArray(parsed.events) ? parsed.events : [] };
    } catch {
      return { events: [] };
    }
  }

  private record(
    source: InboundSourceRow,
    provider: InboundProvider,
    event: string | null,
    externalId: string | null,
    result: InboundResult,
    taskId?: string,
    error?: string,
  ): void {
    try {
      this.deliveries.insert({
        id: randomUUID(),
        sourceId: source.id,
        teamId: source.teamId ?? null,
        provider,
        event,
        externalId,
        result,
        taskId: taskId ?? null,
        error: error ?? null,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      // Recording is best-effort; a log failure must never break the receiver.
      this.logger.error(`failed to record inbound delivery: ${err instanceof Error ? err.message : err}`);
    }
  }
}
