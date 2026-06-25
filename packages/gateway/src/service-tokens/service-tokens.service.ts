import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ServiceToken } from '@midnite/shared';
import { ServiceTokensRepository } from './service-tokens.repository';

/** Prefix all tokens with this string so they're identifiable in logs/audit. */
const TOKEN_PREFIX = 'mnt_';

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function toServiceToken(row: {
  id: string;
  name: string;
  prefix: string;
  teamId: string | null;
  createdBy: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}): ServiceToken {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    ...(row.teamId ? { teamId: row.teamId } : {}),
    ...(row.createdBy ? { createdBy: row.createdBy } : {}),
    ...(row.lastUsedAt ? { lastUsedAt: row.lastUsedAt } : {}),
    ...(row.expiresAt ? { expiresAt: row.expiresAt } : {}),
    createdAt: row.createdAt,
  };
}

@Injectable()
export class ServiceTokensService {
  private readonly logger = new Logger(ServiceTokensService.name);

  constructor(
    @Inject(ServiceTokensRepository) private readonly repo: ServiceTokensRepository,
  ) {}

  /** Create a new service token. Returns the token metadata + the raw secret (ONCE). */
  create(
    name: string,
    opts?: { expiresAt?: string; createdBy?: string; teamId?: string | null },
  ): { token: ServiceToken; secret: string } {
    const raw = TOKEN_PREFIX + randomBytes(32).toString('hex');
    const hash = sha256(raw);
    const prefix = raw.slice(0, 8 + TOKEN_PREFIX.length); // "mnt_" + 8 hex chars
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id: randomUUID(),
      name,
      tokenHash: hash,
      prefix,
      teamId: opts?.teamId ?? null,
      createdBy: opts?.createdBy ?? null,
      expiresAt: opts?.expiresAt ?? null,
      revokedAt: null,
      lastUsedAt: null,
      createdAt: now,
    });
    return { token: toServiceToken(row), secret: raw };
  }

  /**
   * Validate a raw bearer token. Returns the associated `ServiceToken` on
   * success, or `null` if invalid, revoked, or expired. Updates `last_used_at`
   * on success.
   */
  validate(raw: string): ServiceToken | null {
    if (!raw.startsWith(TOKEN_PREFIX)) return null;
    const hash = sha256(raw);
    const row = this.repo.findByHash(hash);
    if (!row) return null;
    if (row.expiresAt && row.expiresAt < new Date().toISOString()) return null;
    this.repo.touchLastUsed(row.id, new Date().toISOString());
    return toServiceToken(row);
  }

  list(teamId?: string | null): ServiceToken[] {
    return this.repo.list(teamId).map(toServiceToken);
  }

  revoke(id: string): void {
    this.repo.revoke(id, new Date().toISOString());
    this.logger.log(`service token revoked: ${id}`);
  }
}
