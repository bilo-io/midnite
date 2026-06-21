import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WorkflowStorageRepository } from './workflow-storage.repository';

// Business logic for the workflow KV store: JSON (de)serialisation + id/timestamp
// minting. Values are stored as JSON text so any structured payload round-trips.
@Injectable()
export class WorkflowStorageService {
  constructor(
    @Inject(WorkflowStorageRepository) private readonly repo: WorkflowStorageRepository,
  ) {}

  set(workflowId: string, key: string, value: unknown): void {
    const now = new Date().toISOString();
    this.repo.upsert({
      id: randomUUID(),
      workflowId,
      scope: null,
      key,
      value: JSON.stringify(value ?? null),
      createdAt: now,
      updatedAt: now,
    });
  }

  // Returns the stored value, or `undefined` when the key has never been set — the
  // executor maps that to the node's configured default. A stored JSON `null` is a
  // real value and is returned as `null`, distinct from a never-set key.
  get(workflowId: string, key: string): unknown {
    const row = this.repo.get(workflowId, key);
    if (!row) return undefined;
    return JSON.parse(row.value) as unknown;
  }
}
