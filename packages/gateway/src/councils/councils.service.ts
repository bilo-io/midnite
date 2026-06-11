import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AGENT_CLI_DEFAULT,
  type Council,
  type CouncilParticipant,
  type CreateCouncilParticipantRequest,
  type CreateCouncilRequest,
  type UpdateCouncilParticipantRequest,
  type UpdateCouncilRequest,
} from '@midnite/shared';
import { CouncilsRepository } from './councils.repository';

export class CouncilDoesNotExistError extends Error {}
export class CouncilParticipantDoesNotExistError extends Error {}

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
      createdAt: now,
      updatedAt: now,
    });
    return this.repo.hydrateCouncil(row);
  }

  updateCouncil(id: string, req: UpdateCouncilRequest): Council {
    const row = this.repo.updateCouncil(id, {
      ...(req.name !== undefined ? { name: req.name } : {}),
      ...(req.description !== undefined ? { description: req.description } : {}),
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
  createParticipant(councilId: string, req: CreateCouncilParticipantRequest): CouncilParticipant {
    if (!this.repo.getCouncil(councilId)) {
      throw new CouncilDoesNotExistError(`council ${councilId} does not exist`);
    }
    const now = new Date().toISOString();
    const row = this.repo.insertParticipant({
      id: randomUUID(),
      councilId,
      name: req.name ?? '',
      provider: req.provider ?? AGENT_CLI_DEFAULT,
      perspective: req.perspective ?? '',
      createdAt: now,
      updatedAt: now,
    });
    this.repo.updateCouncil(councilId, { updatedAt: now });
    return this.repo.hydrateParticipant(row);
  }

  updateParticipant(
    councilId: string,
    participantId: string,
    req: UpdateCouncilParticipantRequest,
  ): CouncilParticipant {
    const existing = this.repo.getParticipant(participantId);
    if (!existing || existing.councilId !== councilId) {
      throw new CouncilParticipantDoesNotExistError(
        `participant ${participantId} does not exist on council ${councilId}`,
      );
    }
    const now = new Date().toISOString();
    const row = this.repo.updateParticipant(participantId, {
      ...(req.name !== undefined ? { name: req.name } : {}),
      ...(req.provider !== undefined ? { provider: req.provider } : {}),
      ...(req.perspective !== undefined ? { perspective: req.perspective } : {}),
      updatedAt: now,
    })!;
    this.repo.updateCouncil(councilId, { updatedAt: now });
    return this.repo.hydrateParticipant(row);
  }

  deleteParticipant(councilId: string, participantId: string): void {
    const existing = this.repo.getParticipant(participantId);
    if (!existing || existing.councilId !== councilId) {
      throw new CouncilParticipantDoesNotExistError(
        `participant ${participantId} does not exist on council ${councilId}`,
      );
    }
    this.repo.deleteParticipant(participantId);
    this.repo.updateCouncil(councilId, { updatedAt: new Date().toISOString() });
  }
}
