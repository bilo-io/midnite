import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuditAction, AuditEntry, AuditEntityType, AuditListResponse } from '@midnite/shared';
import { AuditRepository, type AuditListFilter } from './audit.repository';

export interface AuditRecordInput {
  entityType: AuditEntityType;
  entityId: string;
  userId?: string | null;
  action: AuditAction;
  payload?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repo: AuditRepository) {}

  /** Fire-and-forget: records the entry, never throws. */
  record(input: AuditRecordInput): void {
    try {
      this.repo.insert({
        id: randomUUID(),
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId ?? null,
        action: input.action,
        payload: input.payload ? JSON.stringify(input.payload) : null,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn({ err }, 'audit record failed — ignored');
    }
  }

  list(filter: AuditListFilter = {}): AuditListResponse {
    const { rows, total } = this.repo.list(filter);
    return {
      total,
      entries: rows.map((row) => ({
        id: row.id,
        entityType: row.entityType as AuditEntry['entityType'],
        entityId: row.entityId,
        userId: row.userId,
        action: row.action as AuditEntry['action'],
        payload: row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : null,
        createdAt: row.createdAt,
      })),
    };
  }
}
