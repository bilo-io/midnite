import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type {
  InboundSource,
  InboundSourceCreateRequest,
  InboundEventFilter,
  InboundProvider,
  InboundSourceUpdateRequest,
} from '@midnite/shared';
import { CryptoService } from '../../crypto/crypto.service';
import { TeamsService } from '../../teams/teams.service';
import type { InboundSourceRow } from '../../db/schema';
import {
  assertTeamAdmin,
  encryptSecret,
  generateSecret,
  isInTeamScope,
} from '../lib/managed-secret';
import { InboundSourcesRepository } from './inbound-sources.repository';

export class InboundSourceDoesNotExistError extends Error {
  constructor(id: string) {
    super(`inbound source ${id} not found`);
    this.name = 'InboundSourceDoesNotExistError';
  }
}

export class InboundSourceForbiddenError extends Error {
  constructor() {
    super('managing inbound sources requires the team-admin role');
    this.name = 'InboundSourceForbiddenError';
  }
}

/** Prefix on the raw signing secret so it's identifiable (mirrors `whsec_`). */
const SECRET_PREFIX = 'insec_';

@Injectable()
export class InboundSourcesService {
  private readonly logger = new Logger(InboundSourcesService.name);

  constructor(
    @Inject(InboundSourcesRepository) private readonly repo: InboundSourcesRepository,
    // Optional so unit specs wire only what they exercise. Explicit `@Inject`
    // tokens because the e2e gateway runs under `tsx` (no emitted param metadata).
    @Optional() @Inject(CryptoService) private readonly crypto?: CryptoService,
    @Optional() @Inject(TeamsService) private readonly teams?: TeamsService,
  ) {}

  /** Team-scoped list (any member); secrets never included. */
  list(teamId: string | null | undefined): InboundSource[] {
    return this.repo.list(teamId ?? null).map((r) => this.hydrate(r));
  }

  /** Create a source (team-admin). Returns the row + the raw secret (ONCE). */
  create(
    teamId: string | null | undefined,
    userId: string | null | undefined,
    req: InboundSourceCreateRequest,
  ): { source: InboundSource; secret: string } {
    this.assertAdmin(teamId, userId);
    const secret = generateSecret(SECRET_PREFIX);
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id: randomUUID(),
      teamId: teamId ?? null,
      createdBy: userId ?? null,
      provider: req.provider,
      eventFilter: JSON.stringify(req.eventFilter ?? { events: [] }),
      secret: encryptSecret(this.crypto, secret),
      defaultRepo: req.defaultRepo ?? null,
      defaultProjectId: req.defaultProjectId ?? null,
      enabled: req.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return { source: this.hydrate(row), secret };
  }

  /** Update a source (team-admin). */
  update(
    id: string,
    teamId: string | null | undefined,
    userId: string | null | undefined,
    req: InboundSourceUpdateRequest,
  ): InboundSource {
    this.assertAdmin(teamId, userId);
    this.getScoped(id, teamId);

    const fields: Partial<InboundSourceRow> = { updatedAt: new Date().toISOString() };
    if (req.provider !== undefined) fields.provider = req.provider;
    if (req.eventFilter !== undefined) fields.eventFilter = JSON.stringify(req.eventFilter);
    if (req.defaultRepo !== undefined) fields.defaultRepo = req.defaultRepo;
    if (req.defaultProjectId !== undefined) fields.defaultProjectId = req.defaultProjectId;
    if (req.enabled !== undefined) fields.enabled = req.enabled;

    const row = this.repo.update(id, fields);
    if (!row) throw new InboundSourceDoesNotExistError(id);
    return this.hydrate(row);
  }

  /** Delete a source (team-admin). */
  remove(id: string, teamId: string | null | undefined, userId: string | null | undefined): void {
    this.assertAdmin(teamId, userId);
    this.getScoped(id, teamId);
    this.repo.remove(id);
    this.logger.log(`inbound source removed: ${id}`);
  }

  /** Rotate the signing secret (team-admin). Returns the new raw secret (ONCE). */
  rotateSecret(
    id: string,
    teamId: string | null | undefined,
    userId: string | null | undefined,
  ): { source: InboundSource; secret: string } {
    this.assertAdmin(teamId, userId);
    this.getScoped(id, teamId);
    const secret = generateSecret(SECRET_PREFIX);
    const row = this.repo.update(id, {
      secret: encryptSecret(this.crypto, secret),
      updatedAt: new Date().toISOString(),
    });
    if (!row) throw new InboundSourceDoesNotExistError(id);
    return { source: this.hydrate(row), secret };
  }

  // ── internals ─────────────────────────────────────────────────────────────

  /** Resolve a source within the caller's team scope, or 404. */
  private getScoped(id: string, teamId: string | null | undefined): InboundSourceRow {
    const row = this.repo.findById(id);
    if (!row || !isInTeamScope(row.teamId, teamId)) {
      throw new InboundSourceDoesNotExistError(id);
    }
    return row;
  }

  private assertAdmin(teamId: string | null | undefined, userId: string | null | undefined): void {
    assertTeamAdmin(this.teams, teamId, userId, () => new InboundSourceForbiddenError());
  }

  private hydrate(row: InboundSourceRow): InboundSource {
    return {
      id: row.id,
      teamId: row.teamId ?? null,
      createdBy: row.createdBy ?? null,
      provider: row.provider as InboundProvider,
      eventFilter: JSON.parse(row.eventFilter) as InboundEventFilter,
      defaultRepo: row.defaultRepo ?? null,
      defaultProjectId: row.defaultProjectId ?? null,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
