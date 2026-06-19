import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AGENT_CLI_DEFAULT,
  BRAINSTORM_STARTER_LENSES,
  BRAINSTORM_SYNTH_MODE_DEFAULT,
  BRAINSTORM_SYNTH_PROVIDER_DEFAULT,
  type Brainstorm,
  type BrainstormContributor,
  type CreateBrainstormContributorRequest,
  type CreateBrainstormRequest,
  type UpdateBrainstormContributorRequest,
  type UpdateBrainstormRequest,
} from '@midnite/shared';
import { BrainstormsRepository } from './brainstorms.repository';

export class BrainstormDoesNotExistError extends Error {}
export class BrainstormContributorDoesNotExistError extends Error {}

@Injectable()
export class BrainstormsService {
  constructor(@Inject(BrainstormsRepository) private readonly repo: BrainstormsRepository) {}

  listBrainstorms(): Brainstorm[] {
    return this.repo.listBrainstorms().map((row) => this.repo.hydrateBrainstorm(row));
  }

  getBrainstorm(id: string): Brainstorm {
    const row = this.repo.getBrainstorm(id);
    if (!row) throw new BrainstormDoesNotExistError(`brainstorm ${id} does not exist`);
    return this.repo.hydrateBrainstorm(row);
  }

  createBrainstorm(req: CreateBrainstormRequest): Brainstorm {
    const now = new Date().toISOString();
    const row = this.repo.insertBrainstorm({
      id: randomUUID(),
      name: req.name,
      description: req.description ?? null,
      synthProvider: req.synthProvider ?? BRAINSTORM_SYNTH_PROVIDER_DEFAULT,
      defaultMode: req.defaultMode ?? BRAINSTORM_SYNTH_MODE_DEFAULT,
      createdAt: now,
      updatedAt: now,
    });
    // Seed starter lenses so a fresh board is immediately useful — ordinary
    // contributors the user can edit, reorder, or remove.
    BRAINSTORM_STARTER_LENSES.forEach((l, i) => {
      this.repo.insertContributor({
        id: randomUUID(),
        brainstormId: row.id,
        name: l.name,
        provider: AGENT_CLI_DEFAULT,
        lens: l.lens,
        position: i,
        createdAt: now,
        updatedAt: now,
      });
    });
    return this.repo.hydrateBrainstorm(row);
  }

  updateBrainstorm(id: string, req: UpdateBrainstormRequest): Brainstorm {
    const row = this.repo.updateBrainstorm(id, {
      ...(req.name !== undefined ? { name: req.name } : {}),
      ...(req.description !== undefined ? { description: req.description } : {}),
      ...(req.synthProvider !== undefined ? { synthProvider: req.synthProvider } : {}),
      ...(req.defaultMode !== undefined ? { defaultMode: req.defaultMode } : {}),
      ...(req.archived !== undefined
        ? { archivedAt: req.archived ? new Date().toISOString() : null }
        : {}),
      updatedAt: new Date().toISOString(),
    });
    if (!row) throw new BrainstormDoesNotExistError(`brainstorm ${id} does not exist`);
    return this.repo.hydrateBrainstorm(row);
  }

  deleteBrainstorm(id: string): void {
    if (!this.repo.getBrainstorm(id)) {
      throw new BrainstormDoesNotExistError(`brainstorm ${id} does not exist`);
    }
    this.repo.deleteBrainstorm(id);
  }

  // Blank-create-then-fill (mirrors councils): missing fields coalesce to defaults.
  createContributor(
    brainstormId: string,
    req: CreateBrainstormContributorRequest,
  ): BrainstormContributor {
    if (!this.repo.getBrainstorm(brainstormId)) {
      throw new BrainstormDoesNotExistError(`brainstorm ${brainstormId} does not exist`);
    }
    const now = new Date().toISOString();
    const row = this.repo.insertContributor({
      id: randomUUID(),
      brainstormId,
      name: req.name ?? '',
      provider: req.provider ?? AGENT_CLI_DEFAULT,
      lens: req.lens ?? '',
      position: this.repo.nextContributorPosition(brainstormId),
      createdAt: now,
      updatedAt: now,
    });
    this.repo.updateBrainstorm(brainstormId, { updatedAt: now });
    return this.repo.hydrateContributor(row);
  }

  /**
   * Reorder the brainstorm's contributors. `contributorIds` must be exactly the
   * brainstorm's current contributor ids (every one, no extras); the new order
   * is their index in the list. This drives the tab order of future runs.
   */
  reorderContributors(brainstormId: string, contributorIds: string[]): Brainstorm {
    const brainstorm = this.repo.getBrainstorm(brainstormId);
    if (!brainstorm) {
      throw new BrainstormDoesNotExistError(`brainstorm ${brainstormId} does not exist`);
    }
    const current = this.repo.listContributors(brainstormId).map((c) => c.id);
    const same =
      current.length === contributorIds.length &&
      new Set(contributorIds).size === contributorIds.length &&
      contributorIds.every((id) => current.includes(id));
    if (!same) {
      throw new BrainstormContributorDoesNotExistError(
        'reorder must list every current contributor exactly once',
      );
    }
    this.repo.reorderContributors(brainstormId, contributorIds);
    this.repo.updateBrainstorm(brainstormId, { updatedAt: new Date().toISOString() });
    return this.repo.hydrateBrainstorm(this.repo.getBrainstorm(brainstormId)!);
  }

  updateContributor(
    brainstormId: string,
    contributorId: string,
    req: UpdateBrainstormContributorRequest,
  ): BrainstormContributor {
    const existing = this.repo.getContributor(contributorId);
    if (!existing || existing.brainstormId !== brainstormId) {
      throw new BrainstormContributorDoesNotExistError(
        `contributor ${contributorId} does not exist on brainstorm ${brainstormId}`,
      );
    }
    const now = new Date().toISOString();
    const row = this.repo.updateContributor(contributorId, {
      ...(req.name !== undefined ? { name: req.name } : {}),
      ...(req.provider !== undefined ? { provider: req.provider } : {}),
      ...(req.lens !== undefined ? { lens: req.lens } : {}),
      updatedAt: now,
    })!;
    this.repo.updateBrainstorm(brainstormId, { updatedAt: now });
    return this.repo.hydrateContributor(row);
  }

  deleteContributor(brainstormId: string, contributorId: string): void {
    const existing = this.repo.getContributor(contributorId);
    if (!existing || existing.brainstormId !== brainstormId) {
      throw new BrainstormContributorDoesNotExistError(
        `contributor ${contributorId} does not exist on brainstorm ${brainstormId}`,
      );
    }
    this.repo.deleteContributor(contributorId);
    this.repo.updateBrainstorm(brainstormId, { updatedAt: new Date().toISOString() });
  }
}
