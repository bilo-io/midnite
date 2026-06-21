import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { workflowStorage, type WorkflowStorageInsert, type WorkflowStorageRow } from '../db/schema';

// Drizzle queries only — the per-workflow KV backing storage.set / storage.get.
@Injectable()
export class WorkflowStorageRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  get(workflowId: string, key: string): WorkflowStorageRow | undefined {
    return this.db
      .select()
      .from(workflowStorage)
      .where(and(eq(workflowStorage.workflowId, workflowId), eq(workflowStorage.key, key)))
      .get();
  }

  // Upsert keyed by the (workflow_id, key) unique index: a repeated set overwrites
  // the value and bumps updatedAt, leaving the original id + createdAt in place.
  upsert(row: WorkflowStorageInsert): void {
    this.db
      .insert(workflowStorage)
      .values(row)
      .onConflictDoUpdate({
        target: [workflowStorage.workflowId, workflowStorage.key],
        set: { value: row.value, updatedAt: row.updatedAt },
      })
      .run();
  }
}
