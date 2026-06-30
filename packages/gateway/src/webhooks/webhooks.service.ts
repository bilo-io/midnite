import { randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type {
  Status,
  Task,
  Webhook,
  WebhookCreateRequest,
  WebhookDelivery,
  WebhookDeliveryStatus,
  WebhookEvent,
  WebhookEventFilter,
  WebhookProvider,
  WebhookUpdateRequest,
} from '@midnite/shared';
import { CryptoService } from '../crypto/crypto.service';
import { isSafeHttpUrl } from '../projects/lib/opengraph';
import { TeamsService } from '../teams/teams.service';
import type { WebhookDeliveryRow, WebhookRow } from '../db/schema';
import { WebhookDeliveriesRepository } from './webhook-deliveries.repository';
import { WebhookDeliveryService, type WebhookPayload } from './webhook-delivery.service';
import { WebhooksRepository } from './webhooks.repository';

export class WebhookDeliveryDoesNotExistError extends Error {
  constructor(id: string) {
    super(`webhook delivery ${id} not found`);
    this.name = 'WebhookDeliveryDoesNotExistError';
  }
}

export class WebhookDoesNotExistError extends Error {
  constructor(id: string) {
    super(`webhook ${id} not found`);
    this.name = 'WebhookDoesNotExistError';
  }
}

export class WebhookForbiddenError extends Error {
  constructor() {
    super('managing webhooks requires the team-admin role');
    this.name = 'WebhookForbiddenError';
  }
}

export class UnsafeWebhookUrlError extends Error {
  constructor(url: string) {
    super(`refusing unsafe or invalid webhook URL: ${url}`);
    this.name = 'UnsafeWebhookUrlError';
  }
}

/** Prefix on the raw signing secret so it's identifiable. */
const SECRET_PREFIX = 'whsec_';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject(WebhooksRepository) private readonly repo: WebhooksRepository,
    // Optional so unit specs can wire only what they exercise. Explicit `@Inject`
    // tokens because the e2e gateway runs under `tsx` (no emitted param metadata).
    @Optional() @Inject(CryptoService) private readonly crypto?: CryptoService,
    @Optional() @Inject(TeamsService) private readonly teams?: TeamsService,
    @Optional()
    @Inject(WebhookDeliveriesRepository)
    private readonly deliveriesRepo?: WebhookDeliveriesRepository,
    @Optional()
    @Inject(WebhookDeliveryService)
    private readonly deliveryService?: WebhookDeliveryService,
  ) {}

  /** Team-scoped list (any member); secrets never included. */
  list(teamId: string | null | undefined): Webhook[] {
    return this.repo.list(teamId ?? null).map((r) => this.hydrate(r));
  }

  /** Create an endpoint (team-admin). Returns the row + the raw secret (ONCE). */
  create(
    teamId: string | null | undefined,
    userId: string | null | undefined,
    req: WebhookCreateRequest,
  ): { webhook: Webhook; secret: string } {
    this.assertAdmin(teamId, userId);
    if (!isSafeHttpUrl(req.url)) throw new UnsafeWebhookUrlError(req.url);
    const secret = this.generateSecret();
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id: randomUUID(),
      teamId: teamId ?? null,
      createdBy: userId ?? null,
      url: req.url,
      provider: req.provider,
      eventFilter: JSON.stringify(req.eventFilter),
      secret: this.encryptSecret(secret),
      enabled: req.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return { webhook: this.hydrate(row), secret };
  }

  /** Update an endpoint (team-admin). */
  update(
    id: string,
    teamId: string | null | undefined,
    userId: string | null | undefined,
    req: WebhookUpdateRequest,
  ): Webhook {
    this.assertAdmin(teamId, userId);
    this.getScoped(id, teamId);
    if (req.url !== undefined && !isSafeHttpUrl(req.url)) throw new UnsafeWebhookUrlError(req.url);

    const fields: Partial<WebhookRow> = { updatedAt: new Date().toISOString() };
    if (req.url !== undefined) fields.url = req.url;
    if (req.provider !== undefined) fields.provider = req.provider;
    if (req.eventFilter !== undefined) fields.eventFilter = JSON.stringify(req.eventFilter);
    if (req.enabled !== undefined) fields.enabled = req.enabled;

    const row = this.repo.update(id, fields);
    if (!row) throw new WebhookDoesNotExistError(id);
    return this.hydrate(row);
  }

  /** Delete an endpoint (team-admin). */
  remove(id: string, teamId: string | null | undefined, userId: string | null | undefined): void {
    this.assertAdmin(teamId, userId);
    this.getScoped(id, teamId);
    this.repo.remove(id);
    this.logger.log(`webhook removed: ${id}`);
  }

  /** Rotate the signing secret (team-admin). Returns the new raw secret (ONCE). */
  rotateSecret(
    id: string,
    teamId: string | null | undefined,
    userId: string | null | undefined,
  ): { webhook: Webhook; secret: string } {
    this.assertAdmin(teamId, userId);
    this.getScoped(id, teamId);
    const secret = this.generateSecret();
    const row = this.repo.update(id, {
      secret: this.encryptSecret(secret),
      updatedAt: new Date().toISOString(),
    });
    if (!row) throw new WebhookDoesNotExistError(id);
    return { webhook: this.hydrate(row), secret };
  }

  // ── deliveries (Theme D) ────────────────────────────────────────────────────

  /** Recent delivery attempts for an endpoint (any team member). */
  listDeliveries(
    id: string,
    teamId: string | null | undefined,
    userId: string | null | undefined,
  ): WebhookDelivery[] {
    void userId; // viewing is open to any member; scope is by team only
    this.getScoped(id, teamId);
    return (this.deliveriesRepo?.listByWebhook(id) ?? []).map((r) => this.hydrateDelivery(r));
  }

  /** Fire a synthetic `task.updated` at the endpoint to confirm wiring (team-admin). */
  async sendTest(
    id: string,
    teamId: string | null | undefined,
    userId: string | null | undefined,
  ): Promise<WebhookDelivery> {
    this.assertAdmin(teamId, userId);
    const row = this.getScoped(id, teamId);
    if (!this.deliveryService || !this.deliveriesRepo) {
      throw new Error('delivery service not available');
    }
    const payload: WebhookPayload = {
      event: 'task.updated',
      at: new Date().toISOString(),
      task: this.syntheticTask(teamId),
    };
    const deliveryId = await this.deliveryService.dispatch(row, 'task.updated', payload);
    return this.requireDelivery(deliveryId);
  }

  /** Re-fire a recorded delivery's stored payload — faithful replay (team-admin). */
  async redeliver(
    id: string,
    deliveryId: string,
    teamId: string | null | undefined,
    userId: string | null | undefined,
  ): Promise<WebhookDelivery> {
    this.assertAdmin(teamId, userId);
    const row = this.getScoped(id, teamId);
    if (!this.deliveryService || !this.deliveriesRepo) {
      throw new Error('delivery service not available');
    }
    const original = this.deliveriesRepo.findById(deliveryId);
    if (!original || original.webhookId !== id) {
      throw new WebhookDeliveryDoesNotExistError(deliveryId);
    }
    const newId = await this.deliveryService.dispatchBody(
      row,
      original.event as WebhookEvent,
      original.payload,
    );
    return this.requireDelivery(newId);
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private requireDelivery(deliveryId: string): WebhookDelivery {
    const row = this.deliveriesRepo?.findById(deliveryId);
    if (!row) throw new WebhookDeliveryDoesNotExistError(deliveryId);
    return this.hydrateDelivery(row);
  }

  /** A clearly-synthetic task for the "send test" payload. */
  private syntheticTask(teamId: string | null | undefined): Task {
    const now = new Date().toISOString();
    return {
      id: `test-${randomUUID()}`,
      title: 'midnite test event',
      status: 'wip' as Status,
      priority: 1,
      retryCount: 0,
      fixAttempts: 0,
      tags: ['test'],
      events: [],
      createdAt: now,
      updatedAt: now,
      ...(teamId ? { teamId } : {}),
    };
  }

  private hydrateDelivery(row: WebhookDeliveryRow): WebhookDelivery {
    return {
      id: row.id,
      webhookId: row.webhookId,
      event: row.event as WebhookEvent,
      status: row.status as WebhookDeliveryStatus,
      responseCode: row.responseCode ?? null,
      attempts: row.attempts,
      error: row.error ?? null,
      payload: row.payload,
      createdAt: row.createdAt,
    };
  }

  /** Resolve an endpoint within the caller's team scope, or 404. */
  private getScoped(id: string, teamId: string | null | undefined): WebhookRow {
    const row = this.repo.findById(id);
    if (!row || (row.teamId ?? null) !== (teamId ?? null)) {
      throw new WebhookDoesNotExistError(id);
    }
    return row;
  }

  /**
   * Mutations require the team-admin (or owner) role. With no team context
   * (single-user / JWT off) the local operator is implicitly privileged.
   */
  private assertAdmin(teamId: string | null | undefined, userId: string | null | undefined): void {
    if (!teamId) return;
    const role = this.teams?.getMembership(teamId, userId ?? '') ?? null;
    if (role !== 'admin' && role !== 'owner') throw new WebhookForbiddenError();
  }

  private generateSecret(): string {
    return SECRET_PREFIX + randomBytes(24).toString('hex');
  }

  private encryptSecret(raw: string): string {
    return this.crypto ? this.crypto.encrypt(raw) : raw;
  }

  private hydrate(row: WebhookRow): Webhook {
    return {
      id: row.id,
      teamId: row.teamId ?? null,
      createdBy: row.createdBy ?? null,
      url: row.url,
      provider: row.provider as WebhookProvider,
      eventFilter: JSON.parse(row.eventFilter) as WebhookEventFilter,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
