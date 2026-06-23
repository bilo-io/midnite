import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class WorkflowCredentialsService {
  constructor(
    @Inject(WorkflowCredentialsRepository)
    private readonly repo: WorkflowCredentialsRepository,
  ) {}

  /** Secret-free list — names + types only, never the encrypted material. */
  list(): WorkflowCredential[] {
    return this.repo.list().map(toPublicView);
  }

  /** Store a new credential. The `type` is taken from the secret payload's discriminant
   *  so it has a single source of truth. Fail-closed: rejected with 400 when no key. */
  create(req: CreateWorkflowCredentialRequest): WorkflowCredential {
    const now = new Date().toISOString();
    try {
      const row = this.repo.insert({
        id: randomUUID(),
        name: req.name,
        type: req.data.type,
        data: JSON.stringify(req.data),
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
   * Returns `null` when the credential is missing or can't be decrypted/parsed
   * (key absent or rotated — fail-closed). The plaintext never leaves the gateway.
   */
  resolve(id: string): WorkflowCredentialData | null {
    const row = this.repo.get(id);
    if (!row) return null;
    const plain = this.repo.decryptData(row);
    if (plain === null) return null;
    try {
      const parsed = WorkflowCredentialDataSchema.safeParse(JSON.parse(plain));
      return parsed.success ? parsed.data : null;
    } catch {
      return null; // corrupt blob
    }
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
