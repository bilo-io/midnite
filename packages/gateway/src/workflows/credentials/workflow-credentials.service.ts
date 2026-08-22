import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  WorkflowCredentialDataSchema,
  WorkflowCredentialTypeSchema,
  type CreateWorkflowCredentialRequest,
  type WorkflowCredential,
  type WorkflowCredentialData,
} from '@midnite/shared';
import { SecretEncryptionUnavailableError } from '../../crypto/crypto.service';
import type { WorkflowCredentialRow } from '../../db/schema';
import { WorkflowCredentialsRepository } from './workflow-credentials.repository';
import type { OAuthService } from './oauth.service';

@Injectable()
export class WorkflowCredentialsService {
  private readonly logger = new Logger(WorkflowCredentialsService.name);
  // OAuthService is injected optionally to avoid a circular dep at module init time —
  // WorkflowCredentialsModule exports the service, OAuthService imports it.
  private oauthService: OAuthService | null = null;

  constructor(
    @Inject(WorkflowCredentialsRepository)
    private readonly repo: WorkflowCredentialsRepository,
  ) {}

  /** Called by OAuthModule after both services are initialised. */
  setOAuthService(svc: OAuthService): void {
    this.oauthService = svc;
  }

  /** Every credential, unscoped — names + types only. */
  list(): WorkflowCredential[] {
    return this.repo.list().map(toPublicView);
  }

  /** Credentials `userId` may use: their own, plus install-wide (null-owner) rows. */
  listForUser(userId: string): WorkflowCredential[] {
    return this.repo.listForUser(userId).map(toPublicView);
  }

  /**
   * The acting user's **own** credential of `type`, decrypted — null-owner rows excluded
   * on purpose (an install-wide PAT is not *your* connection). Returns null when there's
   * no such row, or when it can't be decrypted (fail-closed).
   */
  async resolveOwnedByType(
    userId: string,
    type: WorkflowCredentialData['type'],
  ): Promise<{ id: string; name: string; data: WorkflowCredentialData } | null> {
    const row = this.repo.findOwnedByType(userId, type);
    if (!row) return null;
    const data = await this.resolve(row.id);
    return data ? { id: row.id, name: row.name, data } : null;
  }

  /** Store a new credential. The `type` is taken from the secret payload's discriminant
   *  so it has a single source of truth. Fail-closed: rejected with 400 when no key.
   *  `owner` is optional — omitted means an install-wide credential, which is what every
   *  existing caller (and every pre-migration row) is. */
  create(req: CreateWorkflowCredentialRequest, owner?: CredentialOwner): WorkflowCredential {
    return this.createWithId(randomUUID(), req.name, req.data, owner);
  }

  /** Like `create`, but with an explicit id — used by OAuth refresh to preserve the row id. */
  createWithId(
    id: string,
    name: string,
    data: WorkflowCredentialData,
    owner?: CredentialOwner,
  ): WorkflowCredential {
    const now = new Date().toISOString();
    try {
      const row = this.repo.insert({
        id,
        name,
        type: data.type,
        data: JSON.stringify(data),
        userId: owner?.userId ?? null,
        teamId: owner?.teamId ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return toPublicView(row);
    } catch (err) {
      if (err instanceof SecretEncryptionUnavailableError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  /** The owner recorded on a row, so a refresh can preserve it. */
  ownerOf(id: string): CredentialOwner | undefined {
    const row = this.repo.get(id);
    if (!row) return undefined;
    return { userId: row.userId ?? undefined, teamId: row.teamId ?? undefined };
  }

  remove(id: string): void {
    if (!this.repo.remove(id)) {
      throw new NotFoundException(`workflow credential ${id} does not exist`);
    }
  }

  /**
   * Server-side resolution for node executors: decrypt + validate the stored secret.
   * For google-oauth credentials, lazily refreshes the access token when it has expired.
   * Returns `null` when the credential is missing, can't be decrypted, or the token
   * refresh fails (fail-closed). The plaintext never leaves the gateway.
   */
  async resolve(id: string): Promise<WorkflowCredentialData | null> {
    const row = this.repo.get(id);
    if (!row) return null;
    const plain = this.repo.decryptData(row);
    if (plain === null) return null;
    let parsed: WorkflowCredentialData;
    try {
      const result = WorkflowCredentialDataSchema.safeParse(JSON.parse(plain));
      if (!result.success) return null;
      parsed = result.data;
    } catch {
      return null; // corrupt blob
    }

    // Lazy token refresh for Google OAuth: if the access token is expired (or within 60s
    // of expiring), swap it out transparently before returning to the executor.
    if (parsed.type === 'google-oauth' && this.oauthService && parsed.refreshToken) {
      const expiresAt = new Date(parsed.expiresAt).getTime();
      const isExpired = expiresAt - Date.now() < 60_000;
      if (isExpired) {
        this.logger.debug({ credentialId: id }, 'google-oauth token expired — refreshing');
        const refreshed = await this.oauthService.refreshGoogleToken(
          id,
          parsed.refreshToken,
          row.name,
          parsed.scope,
        );
        if (refreshed) {
          return { ...parsed, accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt };
        }
        // Refresh failed — return existing tokens and let the executor fail naturally.
        this.logger.warn({ credentialId: id }, 'google-oauth token refresh failed; using stale token');
      }
    }

    // GitHub connections (Phase 84 Theme A). GitHub OAuth App tokens do **not** expire
    // unless the app opts into expiring tokens, so the overwhelmingly common shape is no
    // `expiresAt` and no `refreshToken` — that's "nothing to refresh", not a broken row,
    // and treating it as an error would break every normal connection.
    if (parsed.type === 'github-oauth' && this.oauthService && parsed.refreshToken && parsed.expiresAt) {
      if (new Date(parsed.expiresAt).getTime() - Date.now() < 60_000) {
        this.logger.debug({ credentialId: id }, 'github-oauth token near expiry — refreshing');
        const refreshed = await this.oauthService.refreshGithubToken(id, parsed, row.name);
        if (refreshed) return refreshed;
        this.logger.warn({ credentialId: id }, 'github-oauth token refresh failed; using stale token');
      }
    }

    return parsed;
  }
}

/** Who a credential belongs to. Both undefined ⇒ shared with the whole install. */
export type CredentialOwner = { userId?: string; teamId?: string };

/** Project a stored row to the public, secret-free shape returned over the API. */
function toPublicView(row: WorkflowCredentialRow): WorkflowCredential {
  return {
    id: row.id,
    name: row.name,
    type: WorkflowCredentialTypeSchema.parse(row.type),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
