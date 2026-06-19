import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AGENT_CLI_DEFAULT,
  COUNCIL_FORMAT_DEFAULT,
  COUNCIL_STARTER_MEMBERS,
  COUNCIL_SYNTH_PROVIDER_DEFAULT,
  type Council,
  type CouncilMember,
  type CreateCouncilMemberRequest,
  type CreateCouncilRequest,
  type UpdateCouncilMemberRequest,
  type UpdateCouncilRequest,
} from '@midnite/shared';
import { CouncilsRepository } from './councils.repository';

export class CouncilDoesNotExistError extends Error {}
export class CouncilMemberDoesNotExistError extends Error {}

@Injectable()
export class CouncilsService {
  constructor(@Inject(CouncilsRepository) private readonly repo: CouncilsRepository) {}

  listCouncils(): Council[] {
    return this.repo.listCouncils().map((row) => this.repo.hydrateCouncil(row));
  }

  getCouncil(id: string): Council {
    const row = this.repo.getCouncil(id);
    if (!row) throw new CouncilDoesNotExistError(`council ${id} does not exist`);
    return this.repo.hydrateCouncil(row);
  }

  createCouncil(req: CreateCouncilRequest): Council {
    const now = new Date().toISOString();
    const row = this.repo.insertCouncil({
      id: randomUUID(),
      name: req.name,
      description: req.description ?? null,
      synthProvider: req.synthProvider ?? COUNCIL_SYNTH_PROVIDER_DEFAULT,
      defaultFormat: req.defaultFormat ?? COUNCIL_FORMAT_DEFAULT,
      customPrompt: req.customPrompt ?? null,
      createdAt: now,
      updatedAt: now,
    });
    // Seed starter members so a fresh council is immediately useful — ordinary
    // members the user can edit, reorder, or remove.
    COUNCIL_STARTER_MEMBERS.forEach((m, i) => {
      this.repo.insertMember({
        id: randomUUID(),
        councilId: row.id,
        name: m.name,
        provider: AGENT_CLI_DEFAULT,
        role: m.role,
        position: i,
        createdAt: now,
        updatedAt: now,
      });
    });
    return this.repo.hydrateCouncil(row);
  }

  updateCouncil(id: string, req: UpdateCouncilRequest): Council {
    const row = this.repo.updateCouncil(id, {
      ...(req.name !== undefined ? { name: req.name } : {}),
      ...(req.description !== undefined ? { description: req.description } : {}),
      ...(req.synthProvider !== undefined ? { synthProvider: req.synthProvider } : {}),
      ...(req.defaultFormat !== undefined ? { defaultFormat: req.defaultFormat } : {}),
      ...(req.customPrompt !== undefined ? { customPrompt: req.customPrompt } : {}),
      ...(req.archived !== undefined
        ? { archivedAt: req.archived ? new Date().toISOString() : null }
        : {}),
      updatedAt: new Date().toISOString(),
    });
    if (!row) throw new CouncilDoesNotExistError(`council ${id} does not exist`);
    return this.repo.hydrateCouncil(row);
  }

  deleteCouncil(id: string): void {
    if (!this.repo.getCouncil(id)) {
      throw new CouncilDoesNotExistError(`council ${id} does not exist`);
    }
    this.repo.deleteCouncil(id);
  }

  // Blank-create-then-fill (mirrors subagents): missing fields coalesce to defaults.
  createMember(councilId: string, req: CreateCouncilMemberRequest): CouncilMember {
    if (!this.repo.getCouncil(councilId)) {
      throw new CouncilDoesNotExistError(`council ${councilId} does not exist`);
    }
    const now = new Date().toISOString();
    const row = this.repo.insertMember({
      id: randomUUID(),
      councilId,
      name: req.name ?? '',
      provider: req.provider ?? AGENT_CLI_DEFAULT,
      role: req.role ?? '',
      position: this.repo.nextMemberPosition(councilId),
      createdAt: now,
      updatedAt: now,
    });
    this.repo.updateCouncil(councilId, { updatedAt: now });
    return this.repo.hydrateMember(row);
  }

  /**
   * Reorder the council's members. `memberIds` must be exactly the council's
   * current member ids (every one, no extras); the new order is their index in
   * the list. This drives the tab order of future runs.
   */
  reorderMembers(councilId: string, memberIds: string[]): Council {
    const council = this.repo.getCouncil(councilId);
    if (!council) {
      throw new CouncilDoesNotExistError(`council ${councilId} does not exist`);
    }
    const current = this.repo.listMembers(councilId).map((m) => m.id);
    const same =
      current.length === memberIds.length &&
      new Set(memberIds).size === memberIds.length &&
      memberIds.every((id) => current.includes(id));
    if (!same) {
      throw new CouncilMemberDoesNotExistError(
        'reorder must list every current member exactly once',
      );
    }
    this.repo.reorderMembers(councilId, memberIds);
    this.repo.updateCouncil(councilId, { updatedAt: new Date().toISOString() });
    return this.repo.hydrateCouncil(this.repo.getCouncil(councilId)!);
  }

  updateMember(
    councilId: string,
    memberId: string,
    req: UpdateCouncilMemberRequest,
  ): CouncilMember {
    const existing = this.repo.getMember(memberId);
    if (!existing || existing.councilId !== councilId) {
      throw new CouncilMemberDoesNotExistError(
        `member ${memberId} does not exist on council ${councilId}`,
      );
    }
    const now = new Date().toISOString();
    const row = this.repo.updateMember(memberId, {
      ...(req.name !== undefined ? { name: req.name } : {}),
      ...(req.provider !== undefined ? { provider: req.provider } : {}),
      ...(req.role !== undefined ? { role: req.role } : {}),
      updatedAt: now,
    })!;
    this.repo.updateCouncil(councilId, { updatedAt: now });
    return this.repo.hydrateMember(row);
  }

  deleteMember(councilId: string, memberId: string): void {
    const existing = this.repo.getMember(memberId);
    if (!existing || existing.councilId !== councilId) {
      throw new CouncilMemberDoesNotExistError(
        `member ${memberId} does not exist on council ${councilId}`,
      );
    }
    this.repo.deleteMember(memberId);
    this.repo.updateCouncil(councilId, { updatedAt: new Date().toISOString() });
  }
}
