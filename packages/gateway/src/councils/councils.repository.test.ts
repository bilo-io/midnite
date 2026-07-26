import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test/db';
import { CouncilsRepository } from './councils.repository';

// A council/member/run row written before `gemini` was retired from the
// `AgentCli` enum (replaced by `antigravity`) still has the literal string
// 'gemini' in its provider columns — the DB has no enum constraint of its own.
// Hydration must coerce it to a currently-valid AgentCli rather than pass it
// through, or the shared zod schema rejects the whole council on the client
// (this broke GET /councils in production after the antigravity swap).
describe('CouncilsRepository — legacy provider coercion', () => {
  let handle: TestDbHandle;
  let repo: CouncilsRepository;
  const now = '2026-01-01T00:00:00.000Z';

  beforeEach(() => {
    handle = createTestDb();
    repo = new CouncilsRepository(handle.db);
  });

  afterEach(() => handle.close());

  it('coerces a legacy gemini synthProvider on a council to antigravity', () => {
    repo.insertCouncil({
      id: 'c1',
      name: 'Legacy council',
      synthProvider: 'gemini',
      defaultFormat: 'brainstorm',
      createdAt: now,
      updatedAt: now,
    });
    const council = repo.hydrateCouncil(repo.getCouncil('c1')!);
    expect(council.synthProvider).toBe('antigravity');
  });

  it('coerces a legacy gemini member provider to antigravity', () => {
    repo.insertCouncil({
      id: 'c1',
      name: 'Legacy council',
      synthProvider: 'claude',
      defaultFormat: 'brainstorm',
      createdAt: now,
      updatedAt: now,
    });
    repo.insertMember({
      id: 'm1',
      councilId: 'c1',
      name: 'Skeptic',
      provider: 'gemini',
      role: 'argue against',
      position: 0,
      createdAt: now,
      updatedAt: now,
    });
    const council = repo.hydrateCouncil(repo.getCouncil('c1')!);
    expect(council.members[0]!.provider).toBe('antigravity');
  });

  it('coerces a legacy gemini synthProvider/provider on a run and its members', () => {
    repo.insertCouncil({
      id: 'c1',
      name: 'Legacy council',
      synthProvider: 'claude',
      defaultFormat: 'brainstorm',
      createdAt: now,
      updatedAt: now,
    });
    repo.insertRun({
      id: 'r1',
      councilId: 'c1',
      prompt: 'topic',
      format: 'brainstorm',
      status: 'completed',
      synthProvider: 'gemini',
      startedAt: now,
    });
    repo.insertRunMember({
      id: 'rm1',
      runId: 'r1',
      memberId: 'm1',
      name: 'Skeptic',
      provider: 'gemini',
      role: 'argue against',
      status: 'succeeded',
      terminalId: 't1',
      startedAt: now,
    });
    const run = repo.hydrateRun(repo.getRun('r1')!);
    expect(run.synthProvider).toBe('antigravity');
    expect(run.members[0]!.provider).toBe('antigravity');
  });

  it('falls back to the default CLI for an unrecognized provider value', () => {
    repo.insertCouncil({
      id: 'c1',
      name: 'Garbage council',
      synthProvider: 'not-a-real-cli',
      defaultFormat: 'brainstorm',
      createdAt: now,
      updatedAt: now,
    });
    const council = repo.hydrateCouncil(repo.getCouncil('c1')!);
    expect(council.synthProvider).toBe('claude');
  });

  it('coerces a legacy gemini synthProvider embedded in a recorded synthesis entry', () => {
    repo.insertCouncil({
      id: 'c1',
      name: 'Legacy council',
      synthProvider: 'claude',
      defaultFormat: 'brainstorm',
      createdAt: now,
      updatedAt: now,
    });
    repo.insertRun({
      id: 'r1',
      councilId: 'c1',
      prompt: 'topic',
      format: 'brainstorm',
      status: 'completed',
      startedAt: now,
    });
    // Written as raw JSON (not via recordSynthesis) since `synthProvider: 'gemini'`
    // no longer type-checks against the current CouncilSynthesisEntry — this is
    // exactly what a row persisted before the retirement looks like on disk.
    repo.updateRun('r1', {
      syntheses: JSON.stringify([
        {
          format: 'brainstorm',
          synthesis: '## Verdict',
          synthProvider: 'gemini',
          anonymized: false,
          finishedAt: now,
        },
      ]),
    });
    const run = repo.hydrateRun(repo.getRun('r1')!);
    expect(run.syntheses[0]!.synthProvider).toBe('antigravity');
  });

  it('passes a current, valid provider through unchanged', () => {
    repo.insertCouncil({
      id: 'c1',
      name: 'Current council',
      synthProvider: 'antigravity',
      defaultFormat: 'brainstorm',
      createdAt: now,
      updatedAt: now,
    });
    const council = repo.hydrateCouncil(repo.getCouncil('c1')!);
    expect(council.synthProvider).toBe('antigravity');
  });
});
