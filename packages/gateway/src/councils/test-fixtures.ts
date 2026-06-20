import type {
  CouncilInsert,
  CouncilMemberInsert,
  CouncilMemberRow,
  CouncilRow,
  CouncilRunInsert,
  CouncilRunMemberInsert,
  CouncilRunMemberRow,
  CouncilRunRow,
} from '../db/schema';
import { CouncilsRepository } from './councils.repository';

/**
 * In-memory repo for council tests: overrides the db-touching methods but
 * inherits the pure hydrators (and recordSynthesis, which routes through the
 * overridden getRun/updateRun) from the base. Pattern: InMemoryAgentsRepo.
 */
export class InMemoryCouncilsRepo extends CouncilsRepository {
  councils: CouncilRow[] = [];
  members: CouncilMemberRow[] = [];
  runs: CouncilRunRow[] = [];
  runMembers: CouncilRunMemberRow[] = [];

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
      synthProvider: row.synthProvider ?? 'gemini',
      defaultFormat: row.defaultFormat ?? 'brainstorm',
      customPrompt: row.customPrompt ?? null,
      archivedAt: row.archivedAt ?? null,
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
    this.runMembers = this.runMembers.filter((m) => !runIds.has(m.runId));
    this.runs = this.runs.filter((r) => r.councilId !== id);
    this.members = this.members.filter((m) => m.councilId !== id);
    this.councils = this.councils.filter((c) => c.id !== id);
  }

  override listMembers(councilId: string): CouncilMemberRow[] {
    return this.members
      .filter((m) => m.councilId === councilId)
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
  }

  override getMember(id: string): CouncilMemberRow | undefined {
    return this.members.find((m) => m.id === id);
  }

  override insertMember(row: CouncilMemberInsert): CouncilMemberRow {
    const full: CouncilMemberRow = {
      ...row,
      name: row.name ?? '',
      provider: row.provider ?? 'claude',
      role: row.role ?? '',
      position: row.position ?? 0,
    };
    this.members.push(full);
    return full;
  }

  override nextMemberPosition(councilId: string): number {
    return (
      this.members
        .filter((m) => m.councilId === councilId)
        .reduce((max, m) => Math.max(max, m.position), -1) + 1
    );
  }

  override reorderMembers(councilId: string, orderedIds: string[]): void {
    orderedIds.forEach((id, position) => {
      const m = this.members.find((x) => x.id === id && x.councilId === councilId);
      if (m) m.position = position;
    });
  }

  override updateMember(
    id: string,
    patch: Partial<CouncilMemberInsert>,
  ): CouncilMemberRow | undefined {
    const cur = this.getMember(id);
    if (!cur) return undefined;
    Object.assign(cur, patch);
    return cur;
  }

  override deleteMember(id: string): void {
    this.members = this.members.filter((m) => m.id !== id);
  }

  override listRuns(councilId: string): CouncilRunRow[] {
    return this.runs
      .filter((r) => r.councilId === councilId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  override getRun(id: string): CouncilRunRow | undefined {
    return this.runs.find((r) => r.id === id);
  }

  override countRuns(councilId: string): number {
    return this.runs.filter((r) => r.councilId === councilId).length;
  }

  override listStaleRuns(): CouncilRunRow[] {
    return this.runs.filter((r) => r.status === 'running' || r.status === 'synthesizing');
  }

  override insertRun(row: CouncilRunInsert): CouncilRunRow {
    const full: CouncilRunRow = {
      ...row,
      format: row.format ?? 'brainstorm',
      synthProvider: row.synthProvider ?? null,
      synthesis: row.synthesis ?? null,
      syntheses: row.syntheses ?? null,
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

  override listRunMembers(runId: string): CouncilRunMemberRow[] {
    // Insertion order, mirroring the real repo's `ORDER BY rowid`.
    return this.runMembers.filter((m) => m.runId === runId);
  }

  override insertRunMember(row: CouncilRunMemberInsert): CouncilRunMemberRow {
    const full: CouncilRunMemberRow = {
      ...row,
      output: row.output ?? null,
      exitCode: row.exitCode ?? null,
      error: row.error ?? null,
      finishedAt: row.finishedAt ?? null,
    };
    this.runMembers.push(full);
    return full;
  }

  override updateRunMember(
    id: string,
    patch: Partial<CouncilRunMemberInsert>,
  ): CouncilRunMemberRow | undefined {
    const cur = this.runMembers.find((m) => m.id === id);
    if (!cur) return undefined;
    Object.assign(cur, patch);
    return cur;
  }
}
