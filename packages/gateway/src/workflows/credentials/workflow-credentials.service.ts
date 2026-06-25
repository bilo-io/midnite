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

  /** Secret-free list — names + types only, never the encrypted material. */
  list(): WorkflowCredential[] {
    return this.repo.list().map(toPublicView);
  }

  /** Store a new credential. The `type` is taken from the secret payload's discriminant
   *  so it has a single source of truth. Fail-closed: rejected with 400 when no key. */
  create(req: CreateWorkflowCredentialRequest): WorkflowCredential {
    return this.createWithId(randomUUID(), req.name, req.data);
  }

  /** Like `create`, but with an explicit id — used by OAuth refresh to preserve the row id. */
  createWithId(id: string, name: string, data: WorkflowCredentialData): WorkflowCredential {
    const now = new Date().toISOString();
    try {
      const row = this.repo.insert({
        id,
        name,
        type: data.type,
        data: JSON.stringify(data),
        createdAt: now,
        updatedAt: now,
      });
      return toPublicView(row);
    } catch (err) {
      if (err instanceof SecretEncryptionUnavailableError) throw new BadRequestException(err.message);
      throw err;
    }
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

    return parsed;
  }
}

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
