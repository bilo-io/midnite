import type {
  CouncilInsert,
  CouncilParticipantInsert,
  CouncilParticipantRow,
  CouncilRow,
  CouncilRunInsert,
  CouncilRunParticipantInsert,
  CouncilRunParticipantRow,
  CouncilRunRow,
} from '../db/schema';
import { CouncilsRepository } from './councils.repository';

/**
 * In-memory repo for council tests: overrides the db-touching methods but
 * inherits the pure hydrators from the base (pattern: InMemoryAgentsRepo).
 */
export class InMemoryCouncilsRepo extends CouncilsRepository {
  councils: CouncilRow[] = [];
  participants: CouncilParticipantRow[] = [];
  runs: CouncilRunRow[] = [];
  runParticipants: CouncilRunParticipantRow[] = [];

  constructor() {
    super({} as never);
  }

  override listCouncils(): CouncilRow[] {
    return [...this.councils].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  override getCouncil(id: string): CouncilRow | undefined {
    return this.councils.find((c) => c.id === id);
  }

  override insertCouncil(row: CouncilInsert): CouncilRow {
    const full: CouncilRow = {
      ...row,
      description: row.description ?? null,
      verdictProvider: row.verdictProvider ?? 'gemini',
    };
    this.councils.push(full);
    return full;
  }

  override updateCouncil(id: string, patch: Partial<CouncilInsert>): CouncilRow | undefined {
    const cur = this.getCouncil(id);
    if (!cur) return undefined;
    Object.assign(cur, patch);
    return cur;
  }

  override deleteCouncil(id: string): void {
    const runIds = new Set(this.runs.filter((r) => r.councilId === id).map((r) => r.id));
    this.runParticipants = this.runParticipants.filter((p) => !runIds.has(p.runId));
    this.runs = this.runs.filter((r) => r.councilId !== id);
    this.participants = this.participants.filter((p) => p.councilId !== id);
    this.councils = this.councils.filter((c) => c.id !== id);
  }

  override listParticipants(councilId: string): CouncilParticipantRow[] {
    return this.participants
      .filter((p) => p.councilId === councilId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  override getParticipant(id: string): CouncilParticipantRow | undefined {
    return this.participants.find((p) => p.id === id);
  }

  override insertParticipant(row: CouncilParticipantInsert): CouncilParticipantRow {
    const full: CouncilParticipantRow = {
      ...row,
      name: row.name ?? '',
      provider: row.provider ?? 'claude',
      perspective: row.perspective ?? '',
    };
    this.participants.push(full);
    return full;
  }

  override updateParticipant(
    id: string,
    patch: Partial<CouncilParticipantInsert>,
  ): CouncilParticipantRow | undefined {
    const cur = this.getParticipant(id);
    if (!cur) return undefined;
    Object.assign(cur, patch);
    return cur;
  }

  override deleteParticipant(id: string): void {
    this.participants = this.participants.filter((p) => p.id !== id);
  }

  override listRuns(councilId: string): CouncilRunRow[] {
    return this.runs
      .filter((r) => r.councilId === councilId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  override getRun(id: string): CouncilRunRow | undefined {
    return this.runs.find((r) => r.id === id);
  }

  override listStaleRuns(): CouncilRunRow[] {
    return this.runs.filter((r) => r.status === 'running' || r.status === 'synthesizing');
  }

  override insertRun(row: CouncilRunInsert): CouncilRunRow {
    const full: CouncilRunRow = {
      ...row,
      verdictProvider: row.verdictProvider ?? null,
      verdict: row.verdict ?? null,
      labelMap: row.labelMap ?? null,
      error: row.error ?? null,
      finishedAt: row.finishedAt ?? null,
    };
    this.runs.push(full);
    return full;
  }

  override updateRun(id: string, patch: Partial<CouncilRunInsert>): CouncilRunRow | undefined {
    const cur = this.getRun(id);
    if (!cur) return undefined;
    Object.assign(cur, patch);
    return cur;
  }

  override listRunParticipants(runId: string): CouncilRunParticipantRow[] {
    return this.runParticipants
      .filter((p) => p.runId === runId)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  override insertRunParticipant(row: CouncilRunParticipantInsert): CouncilRunParticipantRow {
    const full: CouncilRunParticipantRow = {
      ...row,
      output: row.output ?? null,
      exitCode: row.exitCode ?? null,
      error: row.error ?? null,
      label: row.label ?? null,
      finishedAt: row.finishedAt ?? null,
    };
    this.runParticipants.push(full);
    return full;
  }

  override updateRunParticipant(
    id: string,
    patch: Partial<CouncilRunParticipantInsert>,
  ): CouncilRunParticipantRow | undefined {
    const cur = this.runParticipants.find((p) => p.id === id);
    if (!cur) return undefined;
    Object.assign(cur, patch);
    return cur;
  }
}
